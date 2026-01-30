import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@/types/socket'
import { roomManager } from './room-manager'
import { gameManager } from './game-manager'
import { validateNickname, validateRoomCode, ABSTAIN_VOTE_ID } from '@/lib/game/utils'
import { v4 as uuidv4 } from 'uuid'
import { Description, GamePhase, Room } from '@/types/game'

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    }
  )

  // Track disconnected players with timeout to allow reconnection
  const disconnectTimeouts = new Map<string, NodeJS.Timeout>()
  const descriptionTimeouts = new Map<string, NodeJS.Timeout>()
  const descriptionDrafts = new Map<string, Map<string, string>>() // roomCode -> (playerId -> draft)
  const reconnectGraceMs = (() => {
    const raw = Number(process.env.PLAYER_RECONNECT_GRACE_MS)
    return Number.isFinite(raw) && raw >= 0 ? raw : 30_000
  })()

  const clearDescriptionTimeout = (roomCode: string) => {
    const timeoutId = descriptionTimeouts.get(roomCode)
    if (timeoutId) {
      clearTimeout(timeoutId)
      descriptionTimeouts.delete(roomCode)
    }
  }

  const setDescriptionDraft = (roomCode: string, playerId: string, text: string) => {
    const byRoom = descriptionDrafts.get(roomCode) || new Map<string, string>()
    byRoom.set(playerId, text)
    descriptionDrafts.set(roomCode, byRoom)
  }

  const getDescriptionDraft = (roomCode: string, playerId: string) => {
    return descriptionDrafts.get(roomCode)?.get(playerId)
  }

  const clearDescriptionDraft = (roomCode: string, playerId: string) => {
    const byRoom = descriptionDrafts.get(roomCode)
    if (!byRoom) return
    byRoom.delete(playerId)
    if (byRoom.size === 0) descriptionDrafts.delete(roomCode)
  }

  const clearRoomDrafts = (roomCode: string) => {
    descriptionDrafts.delete(roomCode)
  }

  const scheduleDiscussionToVoting = (roomCode: string, room: Room) => {
    setTimeout(() => {
      const latestRoom = roomManager.getRoom(roomCode)
      if (!latestRoom) return
      // Only start voting if we're still in the discussion phase (players may have voted early / game advanced).
      if (latestRoom.phase !== GamePhase.DISCUSSING) return

      gameManager.startVoting(latestRoom)
      const updatedSerialized = roomManager.serializeRoom(latestRoom)
      io.to(roomCode).emit('room_update', updatedSerialized)
      const votingTimeLimit = 15
      io.to(roomCode).emit('start_voting', {
        timeLimit: votingTimeLimit,
        startTime: latestRoom.turnStartTime!,
      })

      // Voting timeout: anyone who didn't vote defaults to abstain, then settle.
      setTimeout(() => {
        const latestRoom = roomManager.getRoom(roomCode)
        if (!latestRoom) return
        if (latestRoom.phase !== GamePhase.VOTING) return

        const alivePlayers = Array.from(latestRoom.players.values()).filter((p) => p.isAlive)
        for (const player of alivePlayers) {
          if (!latestRoom.votes.has(player.id)) {
            latestRoom.votes.set(player.id, ABSTAIN_VOTE_ID)
          }
        }

        processVotingResults(io, latestRoom)
      }, votingTimeLimit * 1000)
    }, room.discussionTime * 1000)
  }

  const beginDiscussingPhase = (roomCode: string, room: Room) => {
    clearDescriptionTimeout(roomCode)
    io.to(roomCode).emit('start_discussing', {
      timeLimit: room.discussionTime,
      startTime: room.turnStartTime!,
    })
    scheduleDiscussionToVoting(roomCode, room)
  }

  const scheduleDescriptionTimeout = (
    roomCode: string,
    expectedStartTime: number,
    expectedPlayerId: string,
    timeLimitSeconds: number
  ) => {
    clearDescriptionTimeout(roomCode)

    const timeoutId = setTimeout(() => {
      // Ensure we don't keep a stale timeout around if it fires.
      descriptionTimeouts.delete(roomCode)

      const room = roomManager.getRoom(roomCode)
      if (!room) return
      const phase = room.phase
      if (phase !== GamePhase.DESCRIBING) return
      if (!room.turnStartTime || room.turnStartTime !== expectedStartTime) return

      const currentPlayer = gameManager.getCurrentTurnPlayer(room)
      if (!currentPlayer) {
        // If the turn is invalid (e.g. players left), advance to avoid getting stuck.
        gameManager.advanceTurn(room)
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)

        if (room.phase === GamePhase.DISCUSSING) {
          beginDiscussingPhase(roomCode, room)
          return
        }

        startCurrentTurn(roomCode, room)
        return
      }

      if (currentPlayer.id !== expectedPlayerId) return

      const draft = getDescriptionDraft(roomCode, currentPlayer.id) || ''
      const finalText = draft.trim().slice(0, 200)
      clearDescriptionDraft(roomCode, currentPlayer.id)

      const timeoutDescription: Description = {
        playerId: currentPlayer.id,
        nickname: currentPlayer.nickname,
        text: finalText,
        round: room.currentRound,
        timestamp: Date.now(),
      }

      room.descriptions.push(timeoutDescription)
      room.lastActivityAt = Date.now()

      io.to(roomCode).emit('description_timeout', {
        playerId: currentPlayer.id,
        nickname: currentPlayer.nickname,
      })
      io.to(roomCode).emit('new_description', timeoutDescription)

      const hasNextTurn = gameManager.advanceTurn(room)

      const serialized = roomManager.serializeRoom(room)
      io.to(roomCode).emit('room_update', serialized)

      if (room.phase === GamePhase.DISCUSSING) {
        beginDiscussingPhase(roomCode, room)
        return
      }

      if (hasNextTurn) {
        startCurrentTurn(roomCode, room)
      }
    }, Math.max(0, timeLimitSeconds) * 1000)

    descriptionTimeouts.set(roomCode, timeoutId)
  }

  const startCurrentTurn = (roomCode: string, room: Room) => {
    const currentPlayer = gameManager.getCurrentTurnPlayer(room)
    if (!currentPlayer) {
      // If we can't determine a valid next speaker, avoid deadlock by moving to discussion.
      if (room.phase === GamePhase.DESCRIBING) {
        room.phase = GamePhase.DISCUSSING
        room.turnStartTime = Date.now()
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)
        beginDiscussingPhase(roomCode, room)
      }
      return
    }

    io.to(roomCode).emit('start_turn', {
      playerId: currentPlayer.id,
      nickname: currentPlayer.nickname,
      timeLimit: room.descriptionTime,
      startTime: room.turnStartTime!,
    })
    scheduleDescriptionTimeout(roomCode, room.turnStartTime!, currentPlayer.id, room.descriptionTime)
  }

  // Clean up inactive rooms every 30 minutes
  setInterval(() => {
    const cleaned = roomManager.cleanupInactiveRooms()
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} inactive rooms`)
    }
  }, 30 * 60 * 1000)

  io.on('connection', (socket) => {
    // Reuse playerId from client auth if provided, otherwise generate new
    const clientPlayerId = socket.handshake.auth?.playerId
    const playerId = clientPlayerId || uuidv4()
    socket.data.playerId = playerId

    // Cancel any pending disconnect timeout for this member
    const pendingTimeout = disconnectTimeouts.get(playerId)
    if (pendingTimeout) {
      clearTimeout(pendingTimeout)
      disconnectTimeouts.delete(playerId)
      console.log(`Reconnection detected for player ${playerId}, cancelled disconnect timeout`)

      // Find which room this player belongs to and update their socketId
      for (const code of roomManager.getRoomCodes()) {
        const updated = roomManager.updateMemberSocketId(code, playerId, socket.id)
        if (updated.updated) {
          socket.data.roomCode = code
          socket.join(code)
          // Send current room state to reconnected client
          const room = roomManager.getRoom(code)
          if (room) {
            const serialized = roomManager.serializeRoom(room)
            socket.emit('room_update', serialized)

            // If game is in progress, resend role/word (players only).
            // Do not resend in ENDED/WAITING to avoid popping "身份牌" on refresh in lobby/result state.
            const player = room.players.get(playerId)
            if (
              player &&
              player.role &&
              player.word &&
              room.phase !== GamePhase.WAITING &&
              room.phase !== GamePhase.ENDED
            ) {
              socket.emit('game_started', { role: player.role, word: player.word })
            }

            // If game already ended, resend final result so refreshed clients can render the "准备"页面.
            if (room.phase === GamePhase.ENDED && room.lastGameResult) {
              socket.emit('game_over', room.lastGameResult)
            }

            const spectator = room.spectators.get(playerId)
            if (spectator) {
              socket.data.nickname = spectator.nickname
            } else if (player) {
              socket.data.nickname = player.nickname
            }
          }
          console.log(`Player ${playerId} reconnected to room ${code}`)
          break
        }
      }
    }

    console.log(`Socket connected: ${socket.id}, Player ID: ${playerId}`)

    socket.emit('connected', { playerId })

    // CREATE ROOM
    socket.on('create_room', ({ nickname, descriptionTime, discussionTime, spectatorSeats }, callback) => {
      try {
        const validation = validateNickname(nickname)
        if (!validation.valid) {
          callback({ success: false, error: validation.error })
          return
        }

        const room = roomManager.createRoom(
          playerId,
          nickname.trim(),
          socket.id,
          descriptionTime || 30,
          discussionTime || 60,
          spectatorSeats ?? 5
        )
        socket.data.roomCode = room.code
        socket.data.nickname = nickname.trim()

        socket.join(room.code)

        const serialized = roomManager.serializeRoom(room)
        io.to(room.code).emit('room_update', serialized)

        callback({ success: true, roomCode: room.code })
      } catch (error) {
        console.error('Error creating room:', error)
        callback({ success: false, error: 'Failed to create room' })
      }
    })

    // JOIN ROOM
    socket.on('join_room', ({ roomCode, nickname }, callback) => {
      try {
        const codeValidation = validateRoomCode(roomCode)
        if (!codeValidation.valid) {
          callback({ success: false, error: codeValidation.error })
          return
        }

        const nicknameValidation = validateNickname(nickname)
        if (!nicknameValidation.valid) {
          callback({ success: false, error: nicknameValidation.error })
          return
        }

        const room = roomManager.getRoom(roomCode)
        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const trimmedNickname = nickname.trim()

        // If this playerId is already in the room (player or spectator), treat as a re-join.
        const existingPlayer = room.players.get(playerId)
        const existingSpectator = room.spectators.get(playerId)
        if (existingPlayer || existingSpectator) {
          roomManager.updateMemberSocketId(roomCode, playerId, socket.id)
          socket.data.roomCode = roomCode
          socket.data.nickname = existingPlayer?.nickname || existingSpectator?.nickname
          socket.join(roomCode)

          const serialized = roomManager.serializeRoom(room)
          io.to(roomCode).emit('room_update', serialized)

          callback({ success: true, mode: existingPlayer ? 'player' : 'spectator' })
          return
        }

        const shouldJoinAsPlayer =
          room.phase === GamePhase.WAITING ||
          (room.phase === GamePhase.ENDED && room.players.size < 8)

        const result = shouldJoinAsPlayer
          ? roomManager.addPlayer(roomCode, playerId, trimmedNickname, socket.id)
          : roomManager.addSpectator(roomCode, playerId, trimmedNickname, socket.id)

        if (!result.success) {
          callback({ success: false, error: result.error })
          return
        }

        socket.data.roomCode = roomCode
        socket.data.nickname = trimmedNickname

        socket.join(roomCode)

        const serialized = roomManager.serializeRoom(result.room!)
        io.to(roomCode).emit('room_update', serialized)

        const player = result.room!.players.get(playerId)
        if (player) {
          socket.to(roomCode).emit('player_joined', { player })
          callback({ success: true, mode: 'player' })
          return
        }

        callback({ success: true, mode: 'spectator' })
      } catch (error) {
        console.error('Error joining room:', error)
        callback({ success: false, error: 'Failed to join room' })
      }
    })

    // REJOIN ROOM - client requests room data for a room they're already in
    socket.on('rejoin_room', ({ roomCode }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)
        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const player = room.players.get(playerId)
        const spectator = room.spectators.get(playerId)
        if (!player && !spectator) {
          callback({ success: false, error: 'Not in this room' })
          return
        }

        // Update socket ID and join socket room
        roomManager.updateMemberSocketId(roomCode, playerId, socket.id)
        socket.data.roomCode = roomCode
        socket.data.nickname = player?.nickname || spectator?.nickname
        socket.join(roomCode)

        const serialized = roomManager.serializeRoom(room)
        socket.emit('room_update', serialized)

        // Resend role/word if game in progress (players only).
        if (
          player &&
          player.role &&
          player.word &&
          room.phase !== GamePhase.WAITING &&
          room.phase !== GamePhase.ENDED
        ) {
          socket.emit('game_started', { role: player.role, word: player.word })
        }

        if (room.phase === GamePhase.ENDED && room.lastGameResult) {
          socket.emit('game_over', room.lastGameResult)
        }

        callback({ success: true })
      } catch (error) {
        console.error('Error rejoining room:', error)
        callback({ success: false, error: 'Failed to rejoin room' })
      }
    })

    // LEAVE ROOM
    socket.on('leave_room', ({ roomCode }) => {
      try {
        const { room, wasSpectator } = roomManager.removeMember(roomCode, playerId)

        clearDescriptionDraft(roomCode, playerId)
        socket.leave(roomCode)
        socket.data.roomCode = undefined

        if (!room) {
          clearDescriptionTimeout(roomCode)
          clearRoomDrafts(roomCode)
          return
        }

        if (!wasSpectator && (room.phase === GamePhase.WAITING || room.phase === GamePhase.ENDED)) {
          roomManager.promoteSpectators(room)
        }
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)
        if (!wasSpectator) {
          io.to(roomCode).emit('player_left', { playerId, nickname: socket.data.nickname || 'Unknown' })
        }
      } catch (error) {
        console.error('Error leaving room:', error)
      }
    })

    // START GAME
    socket.on('start_game', async ({ roomCode }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)

        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const host = room.players.get(playerId)
        if (!host || !host.isHost) {
          callback({ success: false, error: 'Only the host can start the game' })
          return
        }

        const result = await gameManager.startGame(room)

        if (!result.success) {
          callback({ success: false, error: result.error })
          return
        }

        // Send role and word to each player (private)
        for (const player of room.players.values()) {
          io.to(player.socketId).emit('game_started', {
            role: player.role!,
            word: player.word!,
          })
        }

        // Notify all players about room update
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)

        // Start first turn (and schedule timeout)
        startCurrentTurn(roomCode, room)

        callback({ success: true })
      } catch (error) {
        console.error('Error starting game:', error)
        callback({ success: false, error: 'Failed to start game' })
      }
    })

    // SUBMIT DESCRIPTION
    socket.on('submit_description', ({ roomCode, text }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)

        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const result = gameManager.submitDescription(room, playerId, text)

        if (!result.success) {
          callback({ success: false, error: result.error })
          return
        }

        // A valid description submission should cancel the turn timeout and clear drafts.
        clearDescriptionTimeout(roomCode)
        clearDescriptionDraft(roomCode, playerId)

        // Broadcast the new description
        const description = room.descriptions[room.descriptions.length - 1]
        io.to(roomCode).emit('new_description', description)

        // Update room state
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)

        if (result.nextTurn) {
          // Start next player's turn
          startCurrentTurn(roomCode, room)
        } else {
          // Move to discussing phase
          beginDiscussingPhase(roomCode, room)
        }

        callback({ success: true })
      } catch (error) {
        console.error('Error submitting description:', error)
        callback({ success: false, error: 'Failed to submit description' })
      }
    })

    // SET DESCRIPTION DRAFT (for timeout auto-submit)
    socket.on('set_description_draft', ({ roomCode, text }) => {
      try {
        const room = roomManager.getRoom(roomCode)
        if (!room) return
        if (room.phase !== GamePhase.DESCRIBING) return

        const player = room.players.get(playerId)
        if (!player || !player.isAlive) return

        const currentPlayer = gameManager.getCurrentTurnPlayer(room)
        if (!currentPlayer || currentPlayer.id !== playerId) return

        const draft = typeof text === 'string' ? text.slice(0, 200) : ''
        setDescriptionDraft(roomCode, playerId, draft)
      } catch (error) {
        console.error('Error setting description draft:', error)
      }
    })

    // SUBMIT VOTE (can be done during DISCUSSING or VOTING phase)
    socket.on('submit_vote', ({ roomCode, targetId }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)

        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const result = gameManager.submitVote(room, playerId, targetId)

        if (!result.success) {
          callback({ success: false, error: result.error })
          return
        }

        // Broadcast updated votes (during DISCUSSING phase) or vote_submitted (during VOTING)
        if (room.phase === GamePhase.DISCUSSING) {
          const serialized = roomManager.serializeRoom(room)
          io.to(roomCode).emit('room_update', serialized)
        } else {
          const serialized = roomManager.serializeRoom(room)
          io.to(roomCode).emit('room_update', serialized)
          io.to(roomCode).emit('vote_submitted', { voterId: playerId })
        }

        callback({ success: true })

        // If all players voted during DISCUSSING phase, fast-forward to results
        if (result.allVoted && room.phase === GamePhase.DISCUSSING) {
          setTimeout(() => {
            processVotingResults(io, room)
          }, 500) // Small delay to let UI update
        }
        // If all players voted during VOTING phase, process results
        else if (result.allVoted && room.phase === GamePhase.VOTING) {
          setTimeout(() => {
            processVotingResults(io, room)
          }, 1000)
        }
      } catch (error) {
        console.error('Error submitting vote:', error)
        callback({ success: false, error: 'Failed to submit vote' })
      }
    })

    // ROOM CHAT (available in all phases)
    socket.on('send_vote_message', ({ roomCode, text }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)
        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const player = room.players.get(playerId)
        if (!player) {
          callback({ success: false, error: 'Not in this room' })
          return
        }

        const message = (text || '').trim()
        if (!message) {
          callback({ success: false, error: 'Message cannot be empty' })
          return
        }
        if (message.length > 200) {
          callback({ success: false, error: 'Message too long (max 200 characters)' })
          return
        }

        const payload = {
          id: uuidv4(),
          playerId,
          nickname: player.nickname,
          text: message,
          timestamp: Date.now(),
        }

        io.to(roomCode).emit('vote_message', payload)
        callback({ success: true })
      } catch (error) {
        console.error('Error sending vote message:', error)
        callback({ success: false, error: 'Failed to send message' })
      }
    })

    // TOGGLE READY (after game ends)
    socket.on('toggle_ready', ({ roomCode }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)

        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const result = gameManager.toggleReady(room, playerId)

        if (!result.success) {
          callback({ success: false, error: result.error })
          return
        }

        // Broadcast updated room state
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)

        callback({ success: true, allReady: result.allReady })
      } catch (error) {
        console.error('Error toggling ready:', error)
        callback({ success: false, error: 'Failed to toggle ready' })
      }
    })

    // RESTART GAME (host only, when all players ready)
    socket.on('restart_game', ({ roomCode }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode)

        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        if (room.hostId !== playerId) {
          callback({ success: false, error: 'Only host can restart game' })
          return
        }

        if (room.phase !== GamePhase.ENDED) {
          callback({ success: false, error: 'Game not ended yet' })
          return
        }

        const allReady = Array.from(room.players.values()).every(p => p.isReady)
        if (!allReady) {
          callback({ success: false, error: 'Not all players are ready' })
          return
        }

        // Reset room and start new game
        gameManager.resetRoom(room)

        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)

        callback({ success: true })
      } catch (error) {
        console.error('Error restarting game:', error)
        callback({ success: false, error: 'Failed to restart game' })
      }
    })

    // DISCONNECT
	    socket.on('disconnect', () => {
	      console.log(`Socket disconnected: ${socket.id}, Player ID: ${playerId}`)

	      const roomCode = socket.data.roomCode
	      if (roomCode) {
	        // Don't remove player immediately - give them time to refresh/reconnect
	        const timeoutId = setTimeout(() => {
	          const { room, wasSpectator } = roomManager.removeMember(roomCode, playerId)

	          if (room) {
	            if (!wasSpectator && (room.phase === GamePhase.WAITING || room.phase === GamePhase.ENDED)) {
	              roomManager.promoteSpectators(room)
	            }
	            const serialized = roomManager.serializeRoom(room)
	            io.to(roomCode).emit('room_update', serialized)
	            if (!wasSpectator) {
	              io.to(roomCode).emit('player_left', { playerId, nickname: socket.data.nickname || 'Unknown' })
	              console.log(`Player ${playerId} removed from room ${roomCode} after disconnect timeout`)
	            } else {
	              console.log(`Spectator ${playerId} removed from room ${roomCode} after disconnect timeout`)
	            }
	          } else {
              clearDescriptionTimeout(roomCode)
              clearRoomDrafts(roomCode)
	            console.log(`Room ${roomCode} deleted after player ${playerId} removed`)
	          }

	          disconnectTimeouts.delete(playerId)
	        }, reconnectGraceMs)

        disconnectTimeouts.set(playerId, timeoutId)
      }
    })

    // PING (for testing)
    socket.on('ping', (callback) => {
      callback('pong')
    })
  })

  // Helper function to process voting results
  function processVotingResults(io: SocketIOServer, room: any) {
    const voteResult = gameManager.processVotes(room)

    // Broadcast vote results
    io.to(room.code).emit('vote_result', voteResult)

    // Update room state
    const serialized = roomManager.serializeRoom(room)
    io.to(room.code).emit('room_update', serialized)

    // Check win condition
    const gameResult = gameManager.checkWinCondition(room)

	    if (gameResult) {
	      // Game over
	      setTimeout(() => {
	        gameManager.endGame(room, gameResult)
	        io.to(room.code).emit('game_over', gameResult)

	        // After game ends, try to promote spectators into player slots (FIFO) if available.
	        roomManager.promoteSpectators(room)

	        const serialized = roomManager.serializeRoom(room)
	        io.to(room.code).emit('room_update', serialized)
	      }, 3000) // Delay to show vote result first
	    } else {
      // Continue to next round
      setTimeout(() => {
        gameManager.startNextRound(room)

        const serialized = roomManager.serializeRoom(room)
        io.to(room.code).emit('room_update', serialized)

        // Start first turn of new round
        startCurrentTurn(room.code, room)
      }, 3000)
    }
  }

  console.log('Socket.io server initialized')

  return io
}
