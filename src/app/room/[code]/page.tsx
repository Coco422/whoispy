'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { connectSocket } from '@/lib/socket/client'
import { useSocketEvent } from '@/lib/socket/hooks'
import { useRoomStore } from '@/stores/room-store'
import { useGameStore } from '@/stores/game-store'
import { GamePhase, PlayerRole, SerializedRoom } from '@/types/game'
import { VoteChatMessage } from '@/types/socket'
import {
  clearStoredRoomSession,
  clearStoredRoomSessionIfMatches,
  setStoredRoomSession,
} from '@/lib/storage/room-session'

// Components
import { WaitingRoom } from '@/components/Room/WaitingRoom'
import { RoleReveal } from '@/components/Game/RoleReveal'
import { DescriptionPhase } from '@/components/Game/DescriptionPhase'
import { DiscussingPhase } from '@/components/Game/DiscussingPhase'
import { VotingPhase } from '@/components/Game/VotingPhase'
import { VoteResultDisplay } from '@/components/Game/VoteResult'
import { GameResultDisplay } from '@/components/Game/GameResult'
import { GameEndedPhase } from '@/components/Game/GameEndedPhase'
import { PlayerList } from '@/components/Game/PlayerList'
import { RoomNotFound } from '@/components/Room/RoomNotFound'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = params.code as string

  const { room, playerId, setRoom, isHost, reset: resetRoom } = useRoomStore()
  const {
    myRole,
    myWord,
    showRoleReveal,
    hasVoted,
    gameResult,
    setMyRole,
    setShowRoleReveal,
    setHasVoted,
    setGameResult,
    reset: resetGame,
  } = useGameStore()

  const [isStarting, setIsStarting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteResult, setVoteResult] = useState<any>(null)
  const [showVoteResult, setShowVoteResult] = useState(false)
  const [roomNotFound, setRoomNotFound] = useState(false)
  const [voteChatMessages, setVoteChatMessages] = useState<VoteChatMessage[]>([])
  const lastRoundRef = useRef<number | null>(null)

  // If we previously stored a session for this room but it no longer exists, clear it.
  useEffect(() => {
    if (!roomNotFound) return
    clearStoredRoomSessionIfMatches(roomCode)
  }, [roomNotFound, roomCode])

  useEffect(() => {
    setVoteChatMessages([])
    lastRoundRef.current = null
  }, [roomCode])

  // Try to get room data on mount (and on reconnect)
  useEffect(() => {
    const socket = connectSocket()
    let isCancelled = false

    const attemptRejoin = () => {
      const currentRoom = useRoomStore.getState().room
      if (currentRoom && currentRoom.code === roomCode) {
        setRoomNotFound(false)
        return
      }

      socket.emit('rejoin_room', { roomCode }, (response) => {
        if (isCancelled) return
        if (!response.success) {
          // Not in this room, show 404
          setRoomNotFound(true)
          return
        }
        setRoomNotFound(false)
        // Success case: room_update event will set the room data
      })
    }

    attemptRejoin()

    // Fallback timeout - if no response within 5 seconds, show 404
    const timeoutId = setTimeout(() => {
      if (isCancelled) return
      const latestRoom = useRoomStore.getState().room
      if (!latestRoom || latestRoom.code !== roomCode) setRoomNotFound(true)
    }, 5000)

    const handleConnect = () => {
      attemptRejoin()
    }
    socket.on('connect', handleConnect)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      socket.off('connect', handleConnect)
    }
  }, [roomCode]) // Only depend on roomCode, not room

  // Socket event handlers
  useSocketEvent<SerializedRoom>('room_update', (data) => {
    setRoomNotFound(false)
    setRoom(data)
    const nickname = playerId ? data.players.find((p) => p.id === playerId)?.nickname : undefined
    setStoredRoomSession({ roomCode: data.code, nickname })

    // If user refreshes during ENDED phase, gameResult in zustand is lost. Re-hydrate from room state.
    if (data.phase === GamePhase.ENDED) {
      if (data.lastGameResult) {
        setGameResult(data.lastGameResult)
      }
    } else {
      setGameResult(null)
    }

    if (lastRoundRef.current !== null && data.currentRound !== lastRoundRef.current) {
      setVoteChatMessages([])
    }
    lastRoundRef.current = data.currentRound
  })

  useSocketEvent('game_started', (data: { role: string; word: string }) => {
    setMyRole(data.role as PlayerRole, data.word)
    setIsStarting(false)
  })

  useSocketEvent('start_turn', () => {
    // Turn started, handled by room update
  })

  useSocketEvent('new_description', () => {
    setIsSubmitting(false)
  })

  useSocketEvent('start_voting', () => {
    setHasVoted(false)
  })

  useSocketEvent('vote_submitted', (data: { voterId: string }) => {
    if (data.voterId === playerId) {
      setIsSubmitting(false)
    }
  })

  useSocketEvent('vote_result', (data) => {
    setVoteResult(data)
    setShowVoteResult(true)

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowVoteResult(false)
    }, 3000)
  })

  useSocketEvent('game_over', (data) => {
    setGameResult(data)
  })

  useSocketEvent<VoteChatMessage>('vote_message', (data) => {
    setVoteChatMessages((prev) => [...prev.slice(-99), data])
  })

  useSocketEvent('player_left', () => {
    // Handled by room_update
  })

  useSocketEvent('error', (data: { message: string }) => {
    alert(data.message)
    setIsStarting(false)
    setIsSubmitting(false)
  })

  // Actions
  const handleStartGame = () => {
    setIsStarting(true)
    const socket = connectSocket()
    socket.emit('start_game', { roomCode }, (response) => {
      if (!response.success) {
        setIsStarting(false)
        alert(response.error || 'Failed to start game')
      }
    })
  }

  const handleLeaveRoom = () => {
    const socket = connectSocket()
    socket.emit('leave_room', { roomCode })
    clearStoredRoomSession()
    setVoteChatMessages([])
    resetRoom()
    resetGame()
    router.push('/')
  }

  const handleSubmitDescription = (text: string) => {
    setIsSubmitting(true)
    const socket = connectSocket()
    socket.emit('submit_description', { roomCode, text }, (response) => {
      if (!response.success) {
        setIsSubmitting(false)
        alert(response.error || 'Failed to submit description')
      }
    })
  }

  const handleSubmitVote = (targetId: string) => {
    setIsSubmitting(true)
    setHasVoted(true)
    const socket = connectSocket()
    socket.emit('submit_vote', { roomCode, targetId }, (response) => {
      if (!response.success) {
        setIsSubmitting(false)
        setHasVoted(false)
        alert(response.error || 'Failed to submit vote')
      } else {
        setIsSubmitting(false)
      }
    })
  }

  const handleSendVoteMessage = (text: string) => {
    const socket = connectSocket()
    socket.emit('send_vote_message', { roomCode, text }, (response) => {
      if (!response.success) {
        alert(response.error || 'Failed to send message')
      }
    })
  }

  const handleToggleReady = () => {
    const socket = connectSocket()
    socket.emit('toggle_ready', { roomCode }, (response) => {
      if (!response.success) {
        alert(response.error || 'Failed to toggle ready')
      }
    })
  }

  const handleRestartGame = () => {
    const socket = connectSocket()
    socket.emit('restart_game', { roomCode }, (response) => {
      if (!response.success) {
        alert(response.error || 'Failed to restart game')
      }
    })
  }

  const handleBackToLobby = () => {
    resetGame()
    // The room should still exist, just reset game state
    // If we want to actually leave, call handleLeaveRoom instead
    router.push('/')
  }

  // Room not found
  if (roomNotFound) {
    return <RoomNotFound />
  }

  // Loading - waiting for room data
  if (!room || !playerId || room.code !== roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载房间中...</p>
        </div>
      </div>
    )
  }

  const currentPlayer = room.players.find((p) => p.id === playerId)
  const isSpectator = !currentPlayer && room.spectators.some((s) => s.id === playerId)
  const canVote = Boolean(currentPlayer && currentPlayer.isAlive)
  const voteDisabledReason = isSpectator ? 'spectator' : currentPlayer && !currentPlayer.isAlive ? 'eliminated' : null
  const canChat = Boolean(currentPlayer) // allow eliminated players to chat, spectators read-only
  const alivePlayers = room.players.filter((p) => p.isAlive)
  const turnIndex =
    room.phase === GamePhase.DESCRIBING
      ? room.currentRound % 2 === 0
        ? alivePlayers.length - 1 - room.currentTurnIndex
        : room.currentTurnIndex
      : null
  const currentTurnPlayer = turnIndex === null ? null : alivePlayers[turnIndex] || null

  return (
    <div className="min-h-screen p-4 py-8">
      {/* Role reveal modal */}
      {showRoleReveal && myRole && myWord && (
        <RoleReveal
          role={myRole}
          word={myWord}
          onContinue={() => setShowRoleReveal(false)}
        />
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">谁是卧底?</h1>
            <p className="text-sm text-gray-600">房间: {roomCode}</p>
          </div>
          {room.phase !== GamePhase.WAITING && (
            <div className="text-right">
              <p className="text-sm text-gray-600">回合 {room.currentRound}</p>
              {myWord && (
                <p className="text-lg font-bold text-primary-600">你的词语: {myWord}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto">
        {room.phase === GamePhase.WAITING && (
          <WaitingRoom
            roomCode={roomCode}
            players={room.players}
            spectators={room.spectators}
            spectatorSeats={room.spectatorSeats}
            isHost={isHost()}
            currentPlayerId={playerId}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            isStarting={isStarting}
          />
        )}

        {room.phase === GamePhase.DESCRIBING && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DescriptionPhase
                currentTurnPlayerId={currentTurnPlayer?.id || null}
                currentTurnPlayerNickname={currentTurnPlayer?.nickname || null}
                currentPlayerId={playerId}
                turnStartTime={room.turnStartTime}
                timeLimit={room.descriptionTime}
                descriptions={room.descriptions}
                players={room.players}
                onSubmitDescription={handleSubmitDescription}
                isSubmitting={isSubmitting}
              />
            </div>
            <div>
              <PlayerList
                players={room.players}
                spectators={room.spectators}
                spectatorSeats={room.spectatorSeats}
                currentPlayerId={playerId}
                showRoles={false}
              />
            </div>
          </div>
        )}

        {room.phase === GamePhase.DISCUSSING && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DiscussingPhase
                discussionStartTime={room.turnStartTime}
                discussionTimeLimit={room.discussionTime}
                descriptions={room.descriptions}
                players={room.players}
                currentPlayerId={playerId}
                votes={room.votes}
                onVote={handleSubmitVote}
                chatMessages={voteChatMessages}
                onSendChat={handleSendVoteMessage}
                chatDisabled={!canChat}
              />
            </div>
            <div>
              <PlayerList
                players={room.players}
                spectators={room.spectators}
                spectatorSeats={room.spectatorSeats}
                currentPlayerId={playerId}
                showRoles={false}
              />
            </div>
          </div>
        )}

        {room.phase === GamePhase.VOTING && !showVoteResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VotingPhase
                players={room.players}
                currentPlayerId={playerId}
                votingStartTime={room.turnStartTime}
                hasVoted={hasVoted}
                onSubmitVote={handleSubmitVote}
                isSubmitting={isSubmitting}
                votes={room.votes}
                chatMessages={voteChatMessages}
                onSendChat={handleSendVoteMessage}
                chatDisabled={!canChat}
                canVote={canVote}
                voteDisabledReason={voteDisabledReason}
              />
            </div>
            <div>
              <PlayerList
                players={room.players}
                spectators={room.spectators}
                spectatorSeats={room.spectatorSeats}
                currentPlayerId={playerId}
                showRoles={false}
              />
            </div>
          </div>
        )}

        {showVoteResult && voteResult && (
          <VoteResultDisplay {...voteResult} players={room.players} />
        )}

        {room.phase === GamePhase.ENDED && gameResult && (
          <GameEndedPhase
            result={gameResult}
            players={room.players}
            currentPlayerId={playerId}
            isSpectator={isSpectator}
            onToggleReady={handleToggleReady}
            onRestartGame={handleRestartGame}
          />
        )}

        {room.phase === GamePhase.ENDED && !gameResult && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-700 font-semibold">游戏已结束，加载结算中...</p>
            <p className="text-sm text-gray-500 mt-2">如果一直卡住，尝试返回首页重新进入。</p>
          </div>
        )}
      </div>
    </div>
  )
}
