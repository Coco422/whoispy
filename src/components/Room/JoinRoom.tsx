'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { generateRandomNickname } from '@/lib/game/nickname-generator'

interface JoinRoomProps {
  onJoinRoom: (roomCode: string, nickname: string) => void
  isLoading?: boolean
  error?: string
}

export function JoinRoom({ onJoinRoom, isLoading, error }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')

  // 初始化时生成随机昵称
  useEffect(() => {
    setNickname(generateRandomNickname())
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomCode.trim() && nickname.trim()) {
      onJoinRoom(roomCode.trim(), nickname.trim())
    }
  }

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setRoomCode(value)
  }

  const handleRegenerate = () => {
    setNickname(generateRandomNickname())
  }

  return (
    <Card title="加入房间">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="房间号"
          type="text"
          value={roomCode}
          onChange={handleRoomCodeChange}
          placeholder="输入6位数字房间号"
          maxLength={6}
          disabled={isLoading}
          autoFocus
        />
        <div>
          <Input
            label="你的昵称"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入你的昵称"
            maxLength={20}
            disabled={isLoading}
            error={error}
          />
          <button
            type="button"
            onClick={handleRegenerate}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            disabled={isLoading}
          >
            🎲 换个昵称
          </button>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={roomCode.length !== 6 || !nickname.trim() || isLoading}
        >
          {isLoading ? '加入中...' : '加入房间'}
        </Button>
      </form>
    </Card>
  )
}
