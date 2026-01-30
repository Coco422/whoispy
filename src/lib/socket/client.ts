'use client'

import { io, Socket } from 'socket.io-client'
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket'
import { useRoomStore } from '@/stores/room-store'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

// Persist playerId in localStorage so reconnections use the same ID
function getStoredPlayerId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('playerId')
}

function storePlayerId(id: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('playerId', id)
  }
}

function syncPlayerIdToStore(id: string | null) {
  if (!id) return
  const { playerId, setPlayerId } = useRoomStore.getState()
  if (playerId !== id) {
    setPlayerId(id)
  }
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    const storedPlayerId = getStoredPlayerId()

    socket = io(url, {
      autoConnect: false,
      reconnection: true,
      // Keep retrying so temporary network issues / refreshes don't "lose" the player.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: storedPlayerId ? { playerId: storedPlayerId } : {},
    })

    // If we already have a stored playerId, hydrate it into the zustand store.
    // This is important for flows that don't hit the home page first (e.g. direct URL access / 404).
    syncPlayerIdToStore(storedPlayerId)

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id)
    })

    // Store playerId when server assigns/confirms it
    socket.on('connected', (data: { playerId: string }) => {
      storePlayerId(data.playerId)
      syncPlayerIdToStore(data.playerId)
      // Update auth for future reconnections
      if (socket) {
        socket.auth = { playerId: data.playerId }
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }

  return socket
}

export function connectSocket() {
  const socket = getSocket()
  // If the store lost playerId (e.g. after a local reset), re-hydrate from localStorage.
  syncPlayerIdToStore(getStoredPlayerId())
  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected || false
}
