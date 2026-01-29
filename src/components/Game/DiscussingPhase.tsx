'use client'

import { Timer } from '../ui/Timer'
import { Description, Player } from '@/types/game'
import { Button } from '../ui/Button'

interface DiscussingPhaseProps {
  discussionStartTime: number | null
  discussionTimeLimit: number
  descriptions: Description[]
  players: Player[]
  currentPlayerId: string
  votes?: Record<string, string> // voterId -> targetId
  onVote: (targetId: string) => void
}

export function DiscussingPhase({
  discussionStartTime,
  discussionTimeLimit,
  descriptions,
  players,
  currentPlayerId,
  votes = {},
  onVote,
}: DiscussingPhaseProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const hasVoted = votes[currentPlayerId] !== undefined
  const myVote = votes[currentPlayerId]
  const alivePlayers = players.filter(p => p.isAlive)
  const votedCount = Object.keys(votes).length

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">推理讨论时间</h2>
          {discussionStartTime && (
            <Timer startTime={discussionStartTime} duration={discussionTimeLimit} />
          )}
        </div>
        <p className="text-gray-600">
          所有玩家已完成描述。现在是推理时间，仔细回顾所有描述并投票找出谁是卧底！
        </p>
        <div className="mt-2 text-sm text-gray-500">
          投票进度：{votedCount} / {alivePlayers.length}
          {votedCount === alivePlayers.length && (
            <span className="ml-2 text-green-600 font-semibold">✓ 全员已投票，即将结算</span>
          )}
        </div>
      </div>

      {/* Description History */}
      <div className="space-y-4 mb-6">
        <h3 className="font-semibold text-gray-900 text-lg mb-3">
          所有描述回顾
        </h3>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {descriptions.map((desc, index) => {
            const player = players.find(p => p.id === desc.playerId)
            const isCurrentPlayer = desc.playerId === currentPlayerId
            const isEliminated = player && !player.isAlive

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  isCurrentPlayer
                    ? 'bg-blue-50 border-blue-200'
                    : isEliminated
                    ? 'bg-gray-100 border-gray-300 opacity-60'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {desc.nickname}
                    </span>
                    {isCurrentPlayer && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        你
                      </span>
                    )}
                    {isEliminated && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                        已淘汰
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    第 {desc.round} 回合
                  </span>
                </div>
                <p className="text-gray-700">{desc.text}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Voting Section */}
      {currentPlayer?.isAlive && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">
            {hasVoted ? '你的投票' : '选择投票对象'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {alivePlayers
              .filter(p => p.id !== currentPlayerId)
              .map((player) => {
                const isSelected = myVote === player.id
                return (
                  <Button
                    key={player.id}
                    onClick={() => onVote(player.id)}
                    variant={isSelected ? 'primary' : 'secondary'}
                    className={`text-left justify-start ${
                      isSelected ? 'ring-2 ring-primary-500' : ''
                    }`}
                    disabled={false}
                  >
                    <span className="flex items-center gap-2">
                      {isSelected && <span>✓</span>}
                      {player.nickname}
                    </span>
                  </Button>
                )
              })}
          </div>

          {hasVoted && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ 你已投票给 <span className="font-semibold">{players.find(p => p.id === myVote)?.nickname}</span>
                {votedCount < alivePlayers.length && (
                  <span className="block mt-1">等待其他玩家投票...</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          💡 提示：边看描述边投票！如果全员都完成投票，将立即跳过倒计时进入结果页面。
        </p>
      </div>
    </div>
  )
}
