'use client'

import { useState } from 'react'
import { Player } from '@/types/game'
import { Button } from '../ui/Button'
import { Timer } from '../ui/Timer'

interface VotingPhaseProps {
  players: Player[]
  currentPlayerId: string
  votingStartTime: number | null
  hasVoted: boolean
  onSubmitVote: (targetId: string) => void
  isSubmitting?: boolean
}

export function VotingPhase({
  players,
  currentPlayerId,
  votingStartTime,
  hasVoted,
  onSubmitVote,
  isSubmitting,
}: VotingPhaseProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const alivePlayers = players.filter(p => p.isAlive && p.id !== currentPlayerId)

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
          投票给你认为是卧底的人
        </p>

        {hasVoted ? (
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
            </div>

            <Button
              onClick={handleVote}
              variant="danger"
              size="lg"
              className="w-full"
              disabled={!selectedPlayerId || isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交投票'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
