'use client'

import { useEffect, useRef, useState } from 'react'
import { VoteChatMessage } from '@/types/socket'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface VoteChatProps {
  messages: VoteChatMessage[]
  currentPlayerId: string
  onSend: (text: string) => void
  disabled?: boolean
}

export function VoteChat({ messages, currentPlayerId, onSend, disabled }: VoteChatProps) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = text.trim()
    if (!message) return
    onSend(message)
    setText('')
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">投票聊天</h3>

      <div
        ref={listRef}
        className="max-h-56 overflow-y-auto space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">还没有消息，来句狠话吧。</p>
        ) : (
          messages.map((m) => {
            const isMe = m.playerId === currentPlayerId
            return (
              <div
                key={m.id}
                className={`text-sm ${isMe ? 'text-primary-800' : 'text-gray-800'}`}
              >
                <span className={`font-semibold ${isMe ? 'text-primary-700' : 'text-gray-900'}`}>
                  {m.nickname}
                  {isMe ? '（你）' : ''}：
                </span>{' '}
                <span className="break-words">{m.text}</span>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
        <div className="flex-1">
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="自由发言…（Enter 发送）"
            maxLength={200}
            disabled={disabled}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={disabled || !text.trim()}
        >
          发送
        </Button>
      </form>
    </div>
  )
}

