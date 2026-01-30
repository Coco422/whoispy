'use client'

import { useEffect, useRef, useState } from 'react'
import { VoteChatMessage } from '@/types/socket'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface FloatingChatProps {
  title?: string
  messages: VoteChatMessage[]
  currentPlayerId: string
  onSend: (text: string) => void
  disabled?: boolean
  disabledReason?: string
}

export function FloatingChat({
  title = '房间聊天',
  messages,
  currentPlayerId,
  onSend,
  disabled = false,
  disabledReason,
}: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [text, setText] = useState('')

  const listRef = useRef<HTMLDivElement | null>(null)
  const prevLenRef = useRef<number>(messages.length)

  useEffect(() => {
    const prevLen = prevLenRef.current
    const nextLen = messages.length
    prevLenRef.current = nextLen

    if (isOpen) return
    if (nextLen <= prevLen) return
    setUnreadCount((c) => Math.min(99, c + (nextLen - prevLen)))
  }, [messages.length, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [isOpen, messages.length])

  const toggleOpen = () => {
    setIsOpen((v) => {
      const next = !v
      if (next) setUnreadCount(0)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    const message = text.trim()
    if (!message) return
    onSend(message)
    setText('')
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button
          type="button"
          onClick={toggleOpen}
          className="flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-2 hover:bg-gray-50 transition-colors"
          aria-label="打开聊天"
        >
          <span className="text-sm font-semibold text-gray-900">聊天</span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white rounded-full px-2 py-0.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <div className="w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 shadow-2xl rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
              {disabled && disabledReason && (
                <p className="text-xs text-gray-500 truncate">{disabledReason}</p>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={toggleOpen}>
              收起
            </Button>
          </div>

          <div ref={listRef} className="h-64 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                还没有消息，先来一句吧。
              </p>
            ) : (
              messages.map((m) => {
                const isMe = m.playerId === currentPlayerId
                return (
                  <div key={m.id} className={`text-sm ${isMe ? 'text-primary-800' : 'text-gray-800'}`}>
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

          <form onSubmit={handleSubmit} className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={disabled ? '无法发言' : '随时聊天…（Enter 发送）'}
                maxLength={200}
                disabled={disabled}
              />
            </div>
            <Button type="submit" variant="primary" disabled={disabled || !text.trim()}>
              发送
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

