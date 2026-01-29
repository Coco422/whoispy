'use client'

import { Player } from '@/types/game'
import { Button } from '../ui/Button'
import { RoomCode } from './RoomCode'

interface WaitingRoomProps {
  roomCode: string
  players: Player[]
  isHost: boolean
  currentPlayerId: string
  onStartGame: () => void
  onLeaveRoom: () => void
  isStarting?: boolean
}

export function WaitingRoom({
  roomCode,
  players,
  isHost,
  currentPlayerId,
  onStartGame,
  onLeaveRoom,
  isStarting,
}: WaitingRoomProps) {
  const canStart = players.length >= 3 && players.length <= 8

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <RoomCode code={roomCode} />

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          玩家 ({players.length}/8)
        </h2>

        <div className="space-y-2 mb-6">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                player.id === currentPlayerId
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{player.nickname}</span>
                {player.isHost && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    房主
                  </span>
                )}
                {player.id === currentPlayerId && (
                  <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-800 rounded-full">
                    你
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {!canStart && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {players.length < 3
                ? `至少还需要 ${3 - players.length} 名玩家才能开始`
                : '最多允许8名玩家'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {isHost ? (
            <Button
              onClick={onStartGame}
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!canStart || isStarting}
            >
              {isStarting ? '开始中...' : '开始游戏'}
            </Button>
          ) : (
            <div className="flex-1 px-4 py-3 bg-gray-100 rounded-lg text-center text-gray-600">
              等待房主开始...
            </div>
          )}
          <Button onClick={onLeaveRoom} variant="secondary" size="lg">
            离开
          </Button>
        </div>
      </div>
    </div>
  )
}
