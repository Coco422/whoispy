'use client'

import { VoteResult, Player } from '@/types/game'

interface VoteResultProps extends VoteResult {
  eliminatedNickname?: string
  players: Player[]
}

export function VoteResultDisplay({ eliminatedPlayerId, voteCounts, isSpyEliminated, eliminatedNickname, players }: VoteResultProps) {
  // Create a map for quick player lookup
  const playerMap = new Map(players.map(p => [p.id, p]))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">投票结果</h2>

        {/* Vote counts */}
        <div className="mb-6 space-y-2">
          <h3 className="font-semibold text-gray-700 mb-3">票数:</h3>
          {Object.entries(voteCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([playerId, count]) => {
              const player = playerMap.get(playerId)
              const nickname = player?.nickname || '未知玩家'

              return (
                <div
                  key={playerId}
                  className={`flex justify-between items-center px-4 py-2 rounded-lg ${
                    playerId === eliminatedPlayerId ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-gray-900 font-medium">{nickname}</span>
                  <span className="font-semibold text-gray-900">{count} 票</span>
                </div>
              )
            })}
        </div>

        {/* Elimination result */}
        {eliminatedPlayerId ? (
          <div className={`rounded-lg p-6 text-center ${isSpyEliminated ? 'bg-green-100' : 'bg-red-100'}`}>
            <h3 className="text-xl font-bold mb-2">
              {eliminatedNickname || '一名玩家'} 已被淘汰!
            </h3>
            {isSpyEliminated ? (
              <p className="text-green-800">他们是卧底！平民获胜！</p>
            ) : (
              <p className="text-red-800">他们是平民。卧底仍在你们之中...</p>
            )}
          </div>
        ) : (
          <div className="bg-yellow-100 rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold text-yellow-900 mb-2">平票!</h3>
            <p className="text-yellow-800">本回合无人被淘汰。</p>
          </div>
        )}
      </div>
    </div>
  )
}
