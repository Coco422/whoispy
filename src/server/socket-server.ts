import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@/types/socket'
import { roomManager } from './room-manager'
import { gameManager } from './game-manager'
import { validateNickname, validateRoomCode } from '@/lib/game/utils'
import { v4 as uuidv4 } from 'uuid'
import { GamePhase } from '@/types/game'

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
  const reconnectGraceMs = (() => {
    const raw = Number(process.env.PLAYER_RECONNECT_GRACE_MS)
    return Number.isFinite(raw) && raw >= 0 ? raw : 30_000
  })()

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

    // Cancel any pending disconnect timeout for this player
    const pendingTimeout = disconnectTimeouts.get(playerId)
    if (pendingTimeout) {
      clearTimeout(pendingTimeout)
      disconnectTimeouts.delete(playerId)
      console.log(`Reconnection detected for player ${playerId}, cancelled disconnect timeout`)

      // Find which room this player belongs to and update their socketId
      for (const code of roomManager.getRoomCodes()) {
        const updated = roomManager.updatePlayerSocketId(code, playerId, socket.id)
        if (updated) {
          socket.data.roomCode = code
          socket.join(code)
          // Send current room state to reconnected client
          const room = roomManager.getRoom(code)
          if (room) {
            const serialized = roomManager.serializeRoom(room)
            socket.emit('room_update', serialized)

            // If game is in progress, resend role/word
            const player = room.players.get(playerId)
            if (player && player.role && player.word) {
              socket.emit('game_started', { role: player.role, word: player.word })
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
    socket.on('create_room', ({ nickname, descriptionTime, discussionTime }, callback) => {
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
          discussionTime || 60
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

        const result = roomManager.addPlayer(roomCode, playerId, nickname.trim(), socket.id)

        if (!result.success) {
          callback({ success: false, error: result.error })
          return
        }

        socket.data.roomCode = roomCode
        socket.data.nickname = nickname.trim()

        socket.join(roomCode)

        const serialized = roomManager.serializeRoom(result.room!)
        io.to(roomCode).emit('room_update', serialized)

        const player = result.room!.players.get(playerId)
        if (player) {
          socket.to(roomCode).emit('player_joined', { player })
        }

        callback({ success: true })
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
        if (!player) {
          callback({ success: false, error: 'Not in this room' })
          return
        }

        // Update socket ID and join socket room
        roomManager.updatePlayerSocketId(roomCode, playerId, socket.id)
        socket.data.roomCode = roomCode
        socket.data.nickname = player.nickname
        socket.join(roomCode)

        const serialized = roomManager.serializeRoom(room)
        socket.emit('room_update', serialized)

        // Resend role/word if game in progress
        if (player.role && player.word) {
          socket.emit('game_started', { role: player.role, word: player.word })
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
        const { room, wasHost } = roomManager.removePlayer(roomCode, playerId)

        socket.leave(roomCode)
        socket.data.roomCode = undefined

        if (room) {
          const serialized = roomManager.serializeRoom(room)
          io.to(roomCode).emit('room_update', serialized)
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

        // Start first turn
        const currentPlayer = gameManager.getCurrentTurnPlayer(room)
        if (currentPlayer) {
          io.to(roomCode).emit('start_turn', {
            playerId: currentPlayer.id,
            nickname: currentPlayer.nickname,
            timeLimit: room.descriptionTime,
            startTime: room.turnStartTime!,
          })
        }

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

        // Broadcast the new description
        const description = room.descriptions[room.descriptions.length - 1]
        io.to(roomCode).emit('new_description', description)

        // Update room state
        const serialized = roomManager.serializeRoom(room)
        io.to(roomCode).emit('room_update', serialized)

        if (result.nextTurn) {
          // Start next player's turn
          const currentPlayer = gameManager.getCurrentTurnPlayer(room)
          if (currentPlayer) {
            io.to(roomCode).emit('start_turn', {
              playerId: currentPlayer.id,
              nickname: currentPlayer.nickname,
              timeLimit: room.descriptionTime,
              startTime: room.turnStartTime!,
            })
          }
        } else {
          // Move to discussing phase
          io.to(roomCode).emit('start_discussing', {
            timeLimit: room.discussionTime,
            startTime: room.turnStartTime!,
          })

          // Auto transition to results if all voted, or to voting after discussion time
          setTimeout(() => {
            // Skip if already moved to results (all voted early)
            if (room.phase === GamePhase.RESULT) {
              return
            }

            gameManager.startVoting(room)
            const updatedSerialized = roomManager.serializeRoom(room)
            io.to(roomCode).emit('room_update', updatedSerialized)
            io.to(roomCode).emit('start_voting', {
              timeLimit: 15,
              startTime: room.turnStartTime!,
            })
          }, room.discussionTime * 1000)
        }

        callback({ success: true })
      } catch (error) {
        console.error('Error submitting description:', error)
        callback({ success: false, error: 'Failed to submit description' })
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
          const { room, wasHost } = roomManager.removePlayer(roomCode, playerId)

          if (room) {
            const serialized = roomManager.serializeRoom(room)
            io.to(roomCode).emit('room_update', serialized)
            io.to(roomCode).emit('player_left', { playerId, nickname: socket.data.nickname || 'Unknown' })
            console.log(`Player ${playerId} removed from room ${roomCode} after disconnect timeout`)
          } else {
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
        const currentPlayer = gameManager.getCurrentTurnPlayer(room)
        if (currentPlayer) {
          io.to(room.code).emit('start_turn', {
            playerId: currentPlayer.id,
            nickname: currentPlayer.nickname,
            timeLimit: room.descriptionTime,
            startTime: room.turnStartTime!,
          })
        }
      }, 3000)
    }
  }

  console.log('Socket.io server initialized')

  return io
}
