import { Player, SerializedRoom, Description, VoteResult, GameResult, TurnInfo } from './game'

export interface VoteChatMessage {
  id: string
  playerId: string
  nickname: string
  text: string
  timestamp: number
}

// Client to Server events
export interface ClientToServerEvents {
  // Room management
  create_room: (
    data: { nickname: string; descriptionTime?: number; discussionTime?: number; spectatorSeats?: number },
    callback: (response: { success: boolean; roomCode?: string; error?: string }) => void
  ) => void
  join_room: (
    data: { roomCode: string; nickname: string },
    callback: (response: { success: boolean; error?: string; mode?: 'player' | 'spectator' }) => void
  ) => void
  rejoin_room: (data: { roomCode: string }, callback: (response: { success: boolean; error?: string }) => void) => void
  leave_room: (data: { roomCode: string }) => void

  // Game flow
  start_game: (data: { roomCode: string }, callback: (response: { success: boolean; error?: string }) => void) => void
  set_description_draft: (data: { roomCode: string; text: string }) => void
  submit_description: (data: { roomCode: string; text: string }, callback: (response: { success: boolean; error?: string }) => void) => void
  submit_vote: (data: { roomCode: string; targetId: string }, callback: (response: { success: boolean; error?: string }) => void) => void
  send_vote_message: (data: { roomCode: string; text: string }, callback: (response: { success: boolean; error?: string }) => void) => void

  // After game ends
  toggle_ready: (data: { roomCode: string }, callback: (response: { success: boolean; error?: string; allReady?: boolean }) => void) => void
  restart_game: (data: { roomCode: string }, callback: (response: { success: boolean; error?: string }) => void) => void

  // Utility
  ping: (callback: (response: string) => void) => void
}

// Server to Client events
export interface ServerToClientEvents {
  // Room updates
  room_update: (data: SerializedRoom) => void
  player_joined: (data: { player: Player }) => void
  player_left: (data: { playerId: string; nickname: string }) => void

  // Game events
  game_started: (data: { role: string; word: string }) => void
  start_turn: (data: TurnInfo) => void
  new_description: (data: Description) => void
  description_timeout: (data: { playerId: string; nickname: string }) => void

  // Voting phase
  start_voting: (data: { timeLimit: number; startTime: number }) => void
  start_discussing: (data: { timeLimit: number; startTime: number }) => void
  vote_submitted: (data: { voterId: string }) => void
  vote_result: (data: VoteResult & { eliminatedNickname?: string }) => void
  vote_message: (data: VoteChatMessage) => void

  // Game end
  game_over: (data: GameResult) => void

  // Errors
  error: (data: { message: string; code?: string }) => void

  // Connection
  connected: (data: { playerId: string }) => void
  reconnected: (data: { room?: SerializedRoom; role?: string; word?: string }) => void
}

// Inter-server events (for horizontal scaling, not used initially)
export interface InterServerEvents {
  ping: () => void
}

// Socket data (attached to each socket)
export interface SocketData {
  playerId: string
  roomCode?: string
  nickname?: string
}
