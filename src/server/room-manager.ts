import { Room, Player, PlayerRole, GamePhase, SerializedRoom, Spectator } from '@/types/game'
import { generateRoomCode, ABSTAIN_VOTE_ID } from '@/lib/game/utils'

const MAX_PLAYERS = 8

export class RoomManager {
  private rooms: Map<string, Room> = new Map()

  /**
   * Create a new room
   */
  createRoom(
    hostId: string,
    hostNickname: string,
    hostSocketId: string,
    descriptionTime: number = 30,
    discussionTime: number = 60,
    spectatorSeats: number = 5
  ): Room {
    let code = generateRoomCode()

    // Ensure unique code
    while (this.rooms.has(code)) {
      code = generateRoomCode()
    }

    const hostPlayer: Player = {
      id: hostId,
      nickname: hostNickname,
      role: null,
      word: null,
      isAlive: true,
      isHost: true,
      isReady: false,
      socketId: hostSocketId,
      joinedAt: Date.now(),
    }

    const room: Room = {
      code,
      hostId,
      players: new Map([[hostId, hostPlayer]]),
      spectators: new Map(),
      spectatorSeats: Math.max(0, Math.floor(spectatorSeats)),
      spectatorQueue: [],
      phase: GamePhase.WAITING,
      currentRound: 0,
      currentTurnIndex: 0,
      turnOrder: [],
      turnStartTime: null,
      descriptions: [],
      votes: new Map(),
      wordPairId: null,
      wordA: null,
      wordB: null,
      descriptionTime, // 房主设置的发言时间
      discussionTime, // 房主设置的推理时间
      usedWordPairIds: [],
      lastGameResult: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    }

    this.rooms.set(code, room)
    console.log(`Room created: ${code} by ${hostNickname}`)

    return room
  }

  /**
   * Get a room by code
   */
  getRoom(code: string): Room | undefined {
    const room = this.rooms.get(code)
    if (room) {
      room.lastActivityAt = Date.now()
    }
    return room
  }

  /**
   * Add a player to a room
   */
  addPlayer(
    code: string,
    playerId: string,
    nickname: string,
    socketId: string
  ): { success: boolean; error?: string; room?: Room } {
    const room = this.rooms.get(code)

    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    if (room.phase !== GamePhase.WAITING && room.phase !== GamePhase.ENDED) {
      return { success: false, error: 'Game already started' }
    }

    if (room.players.size >= MAX_PLAYERS) {
      return { success: false, error: 'Room is full (max 8 players)' }
    }

    // Check if nickname is already taken
    for (const player of room.players.values()) {
      if (player.nickname === nickname) {
        return { success: false, error: 'Nickname already taken' }
      }
    }
    for (const spectator of room.spectators.values()) {
      if (spectator.nickname === nickname) {
        return { success: false, error: 'Nickname already taken' }
      }
    }

    const player: Player = {
      id: playerId,
      nickname,
      role: null,
      word: null,
      isAlive: true,
      isHost: false,
      isReady: false,
      socketId,
      joinedAt: Date.now(),
    }

    room.players.set(playerId, player)
    room.lastActivityAt = Date.now()

    console.log(`Player ${nickname} joined room ${code}`)

    return { success: true, room }
  }

  /**
   * Add a spectator to a room (allowed when game already started)
   */
  addSpectator(
    code: string,
    spectatorId: string,
    nickname: string,
    socketId: string
  ): { success: boolean; error?: string; room?: Room } {
    const room = this.rooms.get(code)

    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    if (room.phase === GamePhase.WAITING) {
      return { success: false, error: 'Game not started yet' }
    }

    if (room.spectatorSeats <= 0) {
      return { success: false, error: 'Spectator seats disabled' }
    }

    if (room.spectators.size >= room.spectatorSeats) {
      return { success: false, error: 'Spectator seats are full' }
    }

    // Check if nickname is already taken
    for (const player of room.players.values()) {
      if (player.nickname === nickname) {
        return { success: false, error: 'Nickname already taken' }
      }
    }
    for (const spectator of room.spectators.values()) {
      if (spectator.nickname === nickname) {
        return { success: false, error: 'Nickname already taken' }
      }
    }

    const spectator: Spectator = {
      id: spectatorId,
      nickname,
      socketId,
      joinedAt: Date.now(),
    }

    room.spectators.set(spectatorId, spectator)
    room.spectatorQueue.push(spectatorId)
    room.lastActivityAt = Date.now()

    console.log(`Spectator ${nickname} joined room ${code}`)

    return { success: true, room }
  }

  /**
   * Remove a player from a room
   */
  removeMember(code: string, memberId: string): { room?: Room; wasHost: boolean; wasSpectator: boolean } {
    const room = this.rooms.get(code)

    if (!room) {
      return { wasHost: false, wasSpectator: false }
    }

    const player = room.players.get(memberId)
    const spectator = room.spectators.get(memberId)
    const wasSpectator = Boolean(spectator) && !player
    const wasHost = player?.isHost || false

    if (player) {
      room.players.delete(memberId)
      // Remove stale votes from and to this player to avoid incorrect tallies / blocking "all voted".
      if (room.votes.size > 0) {
        room.votes.delete(memberId)
        for (const [voterId, targetId] of room.votes.entries()) {
          if (targetId === memberId) {
            room.votes.set(voterId, ABSTAIN_VOTE_ID)
          }
        }
      }
    } else if (spectator) {
      room.spectators.delete(memberId)
      room.spectatorQueue = room.spectatorQueue.filter((id) => id !== memberId)
    }
    room.lastActivityAt = Date.now()

    // If no players left, delete room
    if (room.players.size === 0) {
      this.rooms.delete(code)
      console.log(`Room ${code} deleted (no players)`)
      return { wasHost, wasSpectator }
    }

    // If host left, assign new host
    if (wasHost && room.players.size > 0) {
      const newHost = Array.from(room.players.values())[0]
      newHost.isHost = true
      room.hostId = newHost.id
      console.log(`New host assigned in room ${code}: ${newHost.nickname}`)
    }

    return { room, wasHost, wasSpectator }
  }

  /**
   * Update player socket ID (for reconnection)
   */
  updateMemberSocketId(code: string, memberId: string, socketId: string): { updated: boolean; kind?: 'player' | 'spectator' } {
    const room = this.rooms.get(code)
    if (!room) return { updated: false }

    const player = room.players.get(memberId)
    if (player) {
      player.socketId = socketId
      room.lastActivityAt = Date.now()
      return { updated: true, kind: 'player' }
    }

    const spectator = room.spectators.get(memberId)
    if (spectator) {
      spectator.socketId = socketId
      room.lastActivityAt = Date.now()
      return { updated: true, kind: 'spectator' }
    }

    return { updated: false }
  }

  /**
   * Promote spectators to players when slots are available (ENDED / WAITING)
   */
  promoteSpectators(room: Room): number {
    if (room.spectators.size === 0) return 0
    const availableSlots = MAX_PLAYERS - room.players.size
    if (availableSlots <= 0) return 0

    let promoted = 0

    while (promoted < availableSlots && room.spectatorQueue.length > 0) {
      const spectatorId = room.spectatorQueue.shift()
      if (!spectatorId) break
      const spectator = room.spectators.get(spectatorId)
      if (!spectator) continue

      room.spectators.delete(spectatorId)

      const player: Player = {
        id: spectator.id,
        nickname: spectator.nickname,
        role: null,
        word: null,
        isAlive: true,
        isHost: false,
        isReady: false,
        socketId: spectator.socketId,
        joinedAt: spectator.joinedAt,
      }

      room.players.set(player.id, player)
      if (room.turnOrder.length > 0 && !room.turnOrder.includes(player.id)) {
        room.turnOrder.push(player.id)
      }

      promoted++
    }

    if (promoted > 0) {
      room.lastActivityAt = Date.now()
      console.log(`Promoted ${promoted} spectators to players in room ${room.code}`)
    }

    return promoted
  }

  /**
   * Get all room codes
   */
  getRoomCodes(): string[] {
    return Array.from(this.rooms.keys())
  }

  /**
   * Delete a room
   */
  deleteRoom(code: string): boolean {
    return this.rooms.delete(code)
  }

  /**
   * Clean up inactive rooms (older than 2 hours)
   */
  cleanupInactiveRooms(): number {
    const now = Date.now()
    const maxAge = 2 * 60 * 60 * 1000 // 2 hours
    let cleaned = 0

    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > maxAge) {
        this.rooms.delete(code)
        cleaned++
        console.log(`Cleaned up inactive room: ${code}`)
      }
    }

    return cleaned
  }

  /**
   * Serialize room for network transmission
   */
  serializeRoom(room: Room): SerializedRoom {
    const players: Player[] = (() => {
      const ordered: Player[] = []
      const seen = new Set<string>()
      const baseOrder = room.turnOrder.length > 0 ? room.turnOrder : Array.from(room.players.keys())

      for (const playerId of baseOrder) {
        const player = room.players.get(playerId)
        if (!player) continue
        ordered.push(player)
        seen.add(playerId)
      }

      // Fallback: include any players that are not in baseOrder (should be rare)
      for (const player of room.players.values()) {
        if (seen.has(player.id)) continue
        ordered.push(player)
      }

      return ordered
    })()

    const spectators: Spectator[] = (() => {
      const ordered: Spectator[] = []
      const seen = new Set<string>()

      for (const spectatorId of room.spectatorQueue) {
        const spectator = room.spectators.get(spectatorId)
        if (!spectator) continue
        ordered.push(spectator)
        seen.add(spectatorId)
      }

      for (const spectator of room.spectators.values()) {
        if (seen.has(spectator.id)) continue
        ordered.push(spectator)
      }

      return ordered
    })()

    return {
      code: room.code,
      hostId: room.hostId,
      players,
      spectators,
      spectatorSeats: room.spectatorSeats,
      phase: room.phase,
      currentRound: room.currentRound,
      currentTurnIndex: room.currentTurnIndex,
      turnStartTime: room.turnStartTime,
      descriptions: room.descriptions,
      descriptionTime: room.descriptionTime,
      discussionTime: room.discussionTime,
      votes: room.phase === GamePhase.DISCUSSING || room.phase === GamePhase.VOTING ? Object.fromEntries(room.votes) : undefined,
      wordPairId: room.wordPairId,
      usedWordPairIds: room.usedWordPairIds,
      lastGameResult: room.phase === GamePhase.ENDED ? room.lastGameResult : undefined,
      createdAt: room.createdAt,
    }
  }

  /**
   * Get total number of active rooms
   */
  getRoomCount(): number {
    return this.rooms.size
  }

  /**
   * Get total number of active players
   */
  getPlayerCount(): number {
    let count = 0
    for (const room of this.rooms.values()) {
      count += room.players.size
    }
    return count
  }
}

// Singleton instance
export const roomManager = new RoomManager()
