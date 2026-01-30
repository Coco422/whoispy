'use client'

import { Player, Spectator } from '@/types/game'
import { Button } from '../ui/Button'
import { RoomCode } from './RoomCode'

interface WaitingRoomProps {
  roomCode: string
  players: Player[]
  spectators?: Spectator[]
  spectatorSeats?: number
  isHost: boolean
  currentPlayerId: string
  onStartGame: () => void
  onLeaveRoom: () => void
  isStarting?: boolean
}

export function WaitingRoom({
  roomCode,
  players,
  spectators = [],
  spectatorSeats = 0,
  isHost,
  currentPlayerId,
  onStartGame,
  onLeaveRoom,
  isStarting,
}: WaitingRoomProps) {
  const canStart = players.length >= 3 && players.length <= 8
  const isSpectatorInThisRoom =
    !players.some((p) => p.id === currentPlayerId) &&
    spectators.some((s) => s.id === currentPlayerId)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <RoomCode code={roomCode} />

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {isSpectatorInThisRoom && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800">
              👀 你在观战席，等待空位加入下一局（有人离开后将按加入顺序自动补位）。
            </p>
          </div>
        )}

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

        {(spectatorSeats > 0 || spectators.length > 0) && (
          <>
            <div className="border-t border-gray-200 my-4"></div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              观战席 ({spectators.length}/{spectatorSeats || '-'})
            </h3>
            {spectators.length > 0 ? (
              <div className="space-y-2 mb-6">
                {spectators.map((spectator) => (
                  <div
                    key={spectator.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                      spectator.id === currentPlayerId
                        ? 'bg-purple-50 border border-purple-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{spectator.nickname}</span>
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                        观战
                      </span>
                      {spectator.id === currentPlayerId && (
                        <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-800 rounded-full">
                          你
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6">暂无观战玩家</p>
            )}
          </>
        )}

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
