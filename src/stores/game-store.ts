import { create } from 'zustand'
import { PlayerRole, GamePhase, Description, GameResult } from '@/types/game'

interface GameState {
  // Player's role and word (private info)
  myRole: PlayerRole | null
  myWord: string | null

  // Game state
  showRoleReveal: boolean
  hasVoted: boolean
  gameResult: GameResult | null

  // Actions
  setMyRole: (role: PlayerRole, word: string) => void
  setShowRoleReveal: (show: boolean) => void
  setHasVoted: (voted: boolean) => void
  setGameResult: (result: GameResult | null) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  myRole: null,
  myWord: null,
  showRoleReveal: false,
  hasVoted: false,
  gameResult: null,

  setMyRole: (role, word) => set({ myRole: role, myWord: word, showRoleReveal: true }),

  setShowRoleReveal: (show) => set({ showRoleReveal: show }),

  setHasVoted: (voted) => set({ hasVoted: voted }),

  setGameResult: (result) => set({ gameResult: result }),

  reset: () =>
    set({
      myRole: null,
      myWord: null,
      showRoleReveal: false,
      hasVoted: false,
      gameResult: null,
    }),
}))
