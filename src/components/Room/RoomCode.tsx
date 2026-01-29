'use client'

import { useState } from 'react'

interface RoomCodeProps {
  code: string
}

export function RoomCode({ code }: RoomCodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">房间代码</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-bold text-primary-600 tracking-wider">{code}</span>
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            {copied ? '已复制!' : '复制'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">与朋友分享此代码</p>
      </div>
    </div>
  )
}
