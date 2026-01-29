'use client'

import { Player } from '@/types/game'

interface PlayerListProps {
  players: Player[]
  currentPlayerId: string
  showRoles?: boolean
}

export function PlayerList({ players, currentPlayerId, showRoles = false }: PlayerListProps) {
  const alivePlayers = players.filter(p => p.isAlive)
  const eliminatedPlayers = players.filter(p => !p.isAlive)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        玩家 ({alivePlayers.length} 存活)
      </h3>

      {/* Alive players */}
      {alivePlayers.length > 0 && (
        <div className="space-y-2 mb-4">
          {alivePlayers.map((player) => (
            <div
              key={player.id}
              className={`px-4 py-2 rounded-lg ${
                player.id === currentPlayerId
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{player.nickname}</span>
                  {player.id === currentPlayerId && (
                    <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full">
                      你
                    </span>
                  )}
                  {showRoles && player.role && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        player.role === 'spy'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {player.role === 'spy' ? '卧底' : '平民'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-500">●</span>
                  <span className="text-xs text-gray-600">存活</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Eliminated players */}
      {eliminatedPlayers.length > 0 && (
        <>
          <div className="border-t border-gray-200 my-4"></div>
          <h4 className="text-sm font-semibold text-gray-600 mb-2">已淘汰</h4>
          <div className="space-y-2">
            {eliminatedPlayers.map((player) => (
              <div
                key={player.id}
                className="px-4 py-2 rounded-lg bg-gray-100 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 line-through">
                      {player.nickname}
                    </span>
                    {showRoles && player.role && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          player.role === 'spy'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {player.role === 'spy' ? '卧底' : '平民'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">●</span>
                    <span className="text-xs text-gray-500">出局</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
