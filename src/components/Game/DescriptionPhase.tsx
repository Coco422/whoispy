'use client'

import { useState } from 'react'
import { Description, Player } from '@/types/game'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Timer } from '../ui/Timer'

interface DescriptionPhaseProps {
  currentTurnPlayerId: string | null
  currentTurnPlayerNickname: string | null
  currentPlayerId: string
  turnStartTime: number | null
  descriptions: Description[]
  players: Player[]
  onSubmitDescription: (text: string) => void
  isSubmitting?: boolean
}

export function DescriptionPhase({
  currentTurnPlayerId,
  currentTurnPlayerNickname,
  currentPlayerId,
  turnStartTime,
  descriptions,
  players,
  onSubmitDescription,
  isSubmitting,
}: DescriptionPhaseProps) {
  const [description, setDescription] = useState('')

  const isMyTurn = currentTurnPlayerId === currentPlayerId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim()) {
      onSubmitDescription(description.trim())
      setDescription('')
    }
  }

  // Get alive players for display
  const alivePlayers = players.filter(p => p.isAlive)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current turn indicator */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {turnStartTime && (
          <div className="mb-4">
            <Timer startTime={turnStartTime} duration={30} />
          </div>
        )}

        <div className="text-center">
          {isMyTurn ? (
            <>
              <h2 className="text-2xl font-bold text-primary-600 mb-2">轮到你了!</h2>
              <p className="text-gray-600">描述你的词语，但不要直接说出来</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentTurnPlayerNickname} 的回合
              </h2>
              <p className="text-gray-600">等待其描述...</p>
            </>
          )}
        </div>

        {isMyTurn && (
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex gap-3">
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入你的描述..."
                maxLength={200}
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!description.trim() || isSubmitting}
              >
                {isSubmitting ? '发送中...' : '提交'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {description.length}/200 字符
            </p>
          </form>
        )}
      </div>

      {/* Descriptions history */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          描述 ({descriptions.length})
        </h3>

        {descriptions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            还没有描述。第一位玩家将开始！
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {descriptions.map((desc, index) => {
              const player = players.find(p => p.id === desc.playerId)
              const isCurrentPlayer = desc.playerId === currentPlayerId

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    isCurrentPlayer ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{desc.nickname}</span>
                      {isCurrentPlayer && (
                        <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full">
                          你
                        </span>
                      )}
                      {!player?.isAlive && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          已淘汰
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">回合 {desc.round}</span>
                  </div>
                  <p className="text-gray-800">{desc.text}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alive players indicator */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          剩余 {alivePlayers.length} 名玩家
        </p>
      </div>
    </div>
  )
}
