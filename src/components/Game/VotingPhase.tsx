'use client'

import { useState } from 'react'
import { Player } from '@/types/game'
import { Button } from '../ui/Button'
import { Timer } from '../ui/Timer'
import { ABSTAIN_VOTE_ID } from '@/lib/game/utils'
import { VoteChat } from './VoteChat'
import { VoteChatMessage } from '@/types/socket'

interface VotingPhaseProps {
  players: Player[]
  currentPlayerId: string
  votingStartTime: number | null
  hasVoted: boolean
  onSubmitVote: (targetId: string) => void
  isSubmitting?: boolean
  votes?: Record<string, string> // voterId -> targetId
  chatMessages?: VoteChatMessage[]
  onSendChat?: (text: string) => void
  chatDisabled?: boolean
  canVote?: boolean
  voteDisabledReason?: 'spectator' | 'eliminated' | null
}

export function VotingPhase({
  players,
  currentPlayerId,
  votingStartTime,
  hasVoted,
  onSubmitVote,
  isSubmitting,
  votes = {},
  chatMessages = [],
  onSendChat,
  chatDisabled = false,
  canVote = true,
  voteDisabledReason = null,
}: VotingPhaseProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const alivePlayers = players.filter(p => p.isAlive && p.id !== currentPlayerId)
  const aliveAllPlayers = players.filter(p => p.isAlive)
  const isAbstaining = selectedPlayerId === ABSTAIN_VOTE_ID
  const votedCount = aliveAllPlayers.filter((p) => votes[p.id] !== undefined).length

  const getVoteTargetLabel = (targetId: string | undefined) => {
    if (!targetId) return '未投'
    if (targetId === ABSTAIN_VOTE_ID) return '弃票'
    return players.find(p => p.id === targetId)?.nickname || '未知玩家'
  }

  const handleVote = () => {
    if (selectedPlayerId) {
      onSubmitVote(selectedPlayerId)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {votingStartTime && (
          <div className="mb-4">
            <Timer startTime={votingStartTime} duration={15} />
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">投票时间!</h2>
        <p className="text-gray-600 text-center mb-6">
          投票给你认为是卧底的人，或选择弃票
        </p>

        {!canVote ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <span className="text-2xl">👀</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {voteDisabledReason === 'spectator' ? '观战中，无法投票' : '已出局，无法投票'}
            </p>
            <p className="text-gray-600 mt-2">你仍可以查看投票指向与聊天内容。</p>
          </div>
        ) : hasVoted ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">已提交投票!</p>
            <p className="text-gray-600 mt-2">等待其他玩家...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {alivePlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedPlayerId === player.id
                      ? 'bg-primary-100 border-2 border-primary-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{player.nickname}</span>
                    {selectedPlayerId === player.id && (
                      <svg
                        className="w-5 h-5 text-primary-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}

              {/* 弃票选项 - 使用不同样式 */}
              <button
                key={ABSTAIN_VOTE_ID}
                onClick={() => setSelectedPlayerId(ABSTAIN_VOTE_ID)}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors border-2 border-dashed ${
                  selectedPlayerId === ABSTAIN_VOTE_ID
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-gray-50/50 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                }`}
                disabled={isSubmitting}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-5 h-5 ${selectedPlayerId === ABSTAIN_VOTE_ID ? 'text-amber-500' : 'text-gray-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    <span className={`font-medium ${selectedPlayerId === ABSTAIN_VOTE_ID ? 'text-amber-700' : 'text-gray-500'}`}>
                      弃票
                    </span>
                  </div>
                  {selectedPlayerId === ABSTAIN_VOTE_ID && (
                    <svg
                      className="w-5 h-5 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            <Button
              onClick={handleVote}
              variant={isAbstaining ? 'secondary' : 'danger'}
              size="lg"
              className="w-full"
              disabled={!selectedPlayerId || isSubmitting}
            >
              {isSubmitting ? '提交中...' : isAbstaining ? '提交弃票' : '提交投票'}
            </Button>
          </>
        )}

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            本轮投票指向（{votedCount}/{aliveAllPlayers.length}）
          </h4>
          <div className="space-y-2">
            {aliveAllPlayers.map((voter) => {
              const targetId = votes[voter.id]
              const label = getVoteTargetLabel(targetId)
              const isMe = voter.id === currentPlayerId
              const hasVotedNow = targetId !== undefined

              return (
                <div key={voter.id} className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${isMe ? 'text-primary-700' : 'text-gray-900'}`}>
                    {voter.nickname}
                    {isMe ? '（你）' : ''}
                  </span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className={hasVotedNow ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {onSendChat && (
        <VoteChat
          messages={chatMessages}
          currentPlayerId={currentPlayerId}
          onSend={onSendChat}
          disabled={chatDisabled}
        />
      )}
    </div>
  )
}
