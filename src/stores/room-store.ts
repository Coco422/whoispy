import { create } from 'zustand'
import { SerializedRoom, Player, GamePhase, Description } from '@/types/game'

interface RoomState {
  // Room data
  room: SerializedRoom | null
  playerId: string | null

  // Actions
  setRoom: (room: SerializedRoom | null) => void
  setPlayerId: (id: string) => void
  updatePlayers: (players: Player[]) => void
  reset: () => void

  // Computed
  getCurrentPlayer: () => Player | null
  isHost: () => boolean
  getPlayerById: (id: string) => Player | null
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  playerId: null,

  setRoom: (room) => set({ room }),

  setPlayerId: (id) => set({ playerId: id }),

  updatePlayers: (players) =>
    set((state) => ({
      room: state.room ? { ...state.room, players } : null,
    })),

  reset: () => set({ room: null, playerId: null }),

  getCurrentPlayer: () => {
    const { room, playerId } = get()
    if (!room || !playerId) return null
    return room.players.find((p) => p.id === playerId) || null
  },

  isHost: () => {
    const { room, playerId } = get()
    if (!room || !playerId) return false
    return room.hostId === playerId
  },

  getPlayerById: (id) => {
    const { room } = get()
    if (!room) return null
    return room.players.find((p) => p.id === id) || null
  },
}))
