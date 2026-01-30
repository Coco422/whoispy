// Game phases
export enum GamePhase {
  WAITING = 'waiting',
  DESCRIBING = 'describing',
  DISCUSSING = 'discussing', // 推理讨论时间
  VOTING = 'voting',
  RESULT = 'result',
  ENDED = 'ended',
}

// Player roles
export enum PlayerRole {
  CIVILIAN = 'civilian',
  SPY = 'spy',
}

// Player interface
export interface Player {
  id: string
  nickname: string
  role: PlayerRole | null
  word: string | null
  isAlive: boolean
  isHost: boolean
  isReady: boolean // 准备状态（游戏结束后）
  socketId: string
  joinedAt: number
}

// Spectator interface
export interface Spectator {
  id: string
  nickname: string
  socketId: string
  joinedAt: number
}

// Description submitted by a player
export interface Description {
  playerId: string
  nickname: string
  text: string
  round: number
  timestamp: number
}

// Vote cast by a player
export interface Vote {
  voterId: string
  targetId: string
}

// Vote result
export interface VoteResult {
  eliminatedPlayerId: string | null
  voteCounts: Record<string, number>
  isSpyEliminated: boolean
}

// Room/Game state
export interface Room {
  code: string
  hostId: string
  players: Map<string, Player>
  spectators: Map<string, Spectator>
  spectatorSeats: number
  spectatorQueue: string[] // 观战席加入顺序（用于游戏结束后补位）
  phase: GamePhase
  currentRound: number
  currentTurnIndex: number
  turnOrder: string[] // 发言顺序基准（用于每回合正反交错）
  turnStartTime: number | null
  descriptionTime: number // 发言时间（秒）15/30/45/60
  discussionTime: number // 推理时间（秒）30/60/90/120
  descriptions: Description[]
  votes: Map<string, string> // voterId -> targetId
  wordPairId: string | null
  wordA: string | null // Civilian word
  wordB: string | null // Spy word
  usedWordPairIds: string[] // 已使用的词组ID列表
  lastGameResult: GameResult | null
  createdAt: number
  lastActivityAt: number
}

// Serialized room (for sending over network)
export interface SerializedRoom {
  code: string
  hostId: string
  players: Player[]
  spectators: Spectator[]
  spectatorSeats: number
  phase: GamePhase
  currentRound: number
  currentTurnIndex: number
  turnStartTime: number | null
  descriptionTime: number
  discussionTime: number
  descriptions: Description[]
  votes?: Record<string, string> // Include votes in DISCUSSING/VOTING phase
  wordPairId: string | null
  usedWordPairIds: string[]
  lastGameResult?: GameResult | null
  createdAt: number
}

// Game result
export interface GameResult {
  winner: 'spy' | 'civilians'
  spyId: string
  spyNickname: string
  wordA: string
  wordB: string
  rounds: number
}

// Turn information
export interface TurnInfo {
  playerId: string
  nickname: string
  timeLimit: number
  startTime: number
}
