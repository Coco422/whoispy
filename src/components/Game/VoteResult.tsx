'use client'

import { VoteResult, Player } from '@/types/game'
import { ABSTAIN_VOTE_ID } from '@/lib/game/utils'

interface VoteResultProps extends VoteResult {
  eliminatedNickname?: string
  players: Player[]
}

export function VoteResultDisplay({ eliminatedPlayerId, voteCounts, isSpyEliminated, eliminatedNickname, players }: VoteResultProps) {
  // Create a map for quick player lookup
  const playerMap = new Map(players.map(p => [p.id, p]))
  const abstainCount = voteCounts[ABSTAIN_VOTE_ID] || 0

  const playerVoteEntries = Object.entries(voteCounts).filter(([id]) => id !== ABSTAIN_VOTE_ID && playerMap.has(id))
  const maxPlayerVotes = playerVoteEntries.reduce((max, [, count]) => Math.max(max, count), 0)
  const playersWithMaxVotes = playerVoteEntries.filter(([, count]) => count === maxPlayerVotes)

  const noEliminationReason =
    maxPlayerVotes === 0 && abstainCount > 0
      ? 'all_abstain'
      : abstainCount > 0 && abstainCount >= maxPlayerVotes
      ? 'abstain_majority'
      : playersWithMaxVotes.length > 1
      ? 'tie'
      : 'unknown'

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
              const nickname = playerId === ABSTAIN_VOTE_ID ? '弃票' : player?.nickname || '未知玩家'

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
            <h3 className="text-xl font-bold text-yellow-900 mb-2">
              {noEliminationReason === 'tie'
                ? '平票!'
                : noEliminationReason === 'abstain_majority' || noEliminationReason === 'all_abstain'
                ? '弃票过多!'
                : '无人淘汰!'}
            </h3>
            <p className="text-yellow-800">
              {noEliminationReason === 'tie'
                ? '本回合无人被淘汰。'
                : noEliminationReason === 'all_abstain'
                ? '全员弃票，本回合无人被淘汰。'
                : noEliminationReason === 'abstain_majority'
                ? '多数玩家选择弃票，本回合无人被淘汰。'
                : '本回合无人被淘汰。'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
