'use client'

import { GameResult } from '@/types/game'
import { Button } from '../ui/Button'

interface GameResultProps extends GameResult {
  onBackToLobby: () => void
}

export function GameResultDisplay({ winner, spyId, spyNickname, wordA, wordB, rounds, onBackToLobby }: GameResultProps) {
  const spyWon = winner === 'spy'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className={`rounded-lg p-6 mb-6 text-center ${spyWon ? 'bg-red-100' : 'bg-green-100'}`}>
          <h2 className="text-3xl font-bold mb-4">
            {spyWon ? '卧底获胜!' : '平民获胜!'}
          </h2>
          <div className="text-xl">
            {spyWon ? '🕵️ 卧底存活!' : '🎉 卧底被抓住了!'}
          </div>
        </div>

        {/* Game info */}
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">卧底:</p>
            <p className="text-lg font-bold text-red-600">{spyNickname}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">平民词语:</p>
              <p className="text-lg font-bold text-green-600">{wordA}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">卧底词语:</p>
              <p className="text-lg font-bold text-red-600">{wordB}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              游戏持续了 <span className="font-bold">{rounds}</span> 回合
            </p>
          </div>
        </div>

        <Button
          onClick={onBackToLobby}
          variant="primary"
          size="lg"
          className="w-full"
        >
          返回大厅
        </Button>
      </div>
    </div>
  )
}
