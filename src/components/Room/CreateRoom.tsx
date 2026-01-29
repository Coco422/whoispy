'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { generateRandomNickname } from '@/lib/game/nickname-generator'

interface CreateRoomProps {
  onCreateRoom: (nickname: string, descriptionTime: number, discussionTime: number) => void
  isLoading?: boolean
  error?: string
}

export function CreateRoom({ onCreateRoom, isLoading, error }: CreateRoomProps) {
  const [nickname, setNickname] = useState('')
  const [descriptionTime, setDescriptionTime] = useState(30)
  const [discussionTime, setDiscussionTime] = useState(60)

  // 初始化时生成随机昵称
  useEffect(() => {
    setNickname(generateRandomNickname())
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim()) {
      onCreateRoom(nickname.trim(), descriptionTime, discussionTime)
    }
  }

  const handleRegenerate = () => {
    setNickname(generateRandomNickname())
  }

  return (
    <Card title="创建房间">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoFocus={false}
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

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            发言时间（每人）
          </label>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setDescriptionTime(time)}
                disabled={isLoading}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  descriptionTime === time
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {time}秒
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            推理时间（讨论）
          </label>
          <div className="flex gap-2">
            {[30, 60, 90, 120].map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setDiscussionTime(time)}
                disabled={isLoading}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  discussionTime === time
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {time}秒
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!nickname.trim() || isLoading}
        >
          {isLoading ? '创建中...' : '创建房间'}
        </Button>
      </form>
    </Card>
  )
}
