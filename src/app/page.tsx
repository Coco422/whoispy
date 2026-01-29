'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateRoom } from '@/components/Room/CreateRoom'
import { JoinRoom } from '@/components/Room/JoinRoom'
import { connectSocket } from '@/lib/socket/client'
import { useSocketEvent } from '@/lib/socket/hooks'
import { useRoomStore } from '@/stores/room-store'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { setPlayerId, setRoom } = useRoomStore()

  useEffect(() => {
    const socket = connectSocket()

    return () => {
      // Don't disconnect on unmount, keep connection alive
    }
  }, [])

  useSocketEvent('connected', (data: { playerId: string }) => {
    setPlayerId(data.playerId)
  })

  useSocketEvent('room_update', (data) => {
    setRoom(data)
  })

  useSocketEvent('error', (data: { message: string }) => {
    setError(data.message)
    setIsLoading(false)
  })

  const handleCreateRoom = (nickname: string, descriptionTime: number, discussionTime: number) => {
    setIsLoading(true)
    setError('')

    const socket = connectSocket()

    socket.emit('create_room', { nickname, descriptionTime, discussionTime }, (response) => {
      if (response.success && response.roomCode) {
        setIsLoading(false)
        router.push(`/room/${response.roomCode}`)
      } else {
        setIsLoading(false)
        setError(response.error || 'Failed to create room')
      }
    })
  }

  const handleJoinRoom = (roomCode: string, nickname: string) => {
    setIsLoading(true)
    setError('')

    const socket = connectSocket()

    socket.emit('join_room', { roomCode, nickname }, (response) => {
      if (response.success) {
        setIsLoading(false)
        router.push(`/room/${roomCode}`)
      } else {
        setIsLoading(false)
        setError(response.error || 'Failed to join room')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            谁是卧底
          </h1>
          <p className="text-lg text-gray-600">Who is the Spy?</p>
          <p className="text-sm text-gray-500 mt-4">
            实时多人社交推理游戏
          </p>
        </div>

        {/* Mode selection or forms */}
        {mode === 'none' ? (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full px-6 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg"
            >
              创建新房间
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full px-6 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-lg border border-gray-200"
            >
              加入房间
            </button>
          </div>
        ) : mode === 'create' ? (
          <div className="space-y-3">
            <CreateRoom
              onCreateRoom={handleCreateRoom}
              isLoading={isLoading}
              error={error}
            />
            <button
              onClick={() => {
                setMode('none')
                setError('')
              }}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <JoinRoom
              onJoinRoom={handleJoinRoom}
              isLoading={isLoading}
              error={error}
            />
            <button
              onClick={() => {
                setMode('none')
                setError('')
              }}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>3-8名玩家 • 实时游戏</p>
        </div>
      </div>
    </div>
  )
}
