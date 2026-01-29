'use client'

import { useEffect, useState } from 'react'
import { PlayerRole } from '@/types/game'

interface RoleRevealProps {
  role: PlayerRole
  word: string
  onContinue: () => void
}

export function RoleReveal({ role, word, onContinue }: RoleRevealProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const isSpy = role === PlayerRole.SPY

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className={`max-w-md w-full mx-4 transition-all duration-500 ${show ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        <div className={`rounded-xl p-8 text-center ${isSpy ? 'bg-red-600' : 'bg-green-600'}`}>
          <h2 className="text-3xl font-bold text-white mb-4">
            {isSpy ? '你是卧底!' : '你是平民'}
          </h2>

          <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6">
            <p className="text-sm text-white text-opacity-90 mb-2">你的词语:</p>
            <p className="text-4xl font-bold text-white">{word}</p>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
            <p className="text-sm text-white text-opacity-90">
              {isSpy
                ? '你的词语与众不同！尽量混入其中，避免被发现。'
                : '大多数玩家拥有相同的词语。找出并淘汰卧底！'}
            </p>
          </div>

          <button
            onClick={onContinue}
            className="w-full px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
          >
            知道了!
          </button>
        </div>
      </div>
    </div>
  )
}
