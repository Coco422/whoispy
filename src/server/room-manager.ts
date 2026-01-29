import { Room, Player, PlayerRole, GamePhase, SerializedRoom } from '@/types/game'
import { generateRoomCode } from '@/lib/game/utils'
import { v4 as uuidv4 } from 'uuid'

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
    discussionTime: number = 60
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
      phase: GamePhase.WAITING,
      currentRound: 0,
      currentTurnIndex: 0,
      turnStartTime: null,
      descriptions: [],
      votes: new Map(),
      wordPairId: null,
      wordA: null,
      wordB: null,
      descriptionTime, // 房主设置的发言时间
      discussionTime, // 房主设置的推理时间
      usedWordPairIds: [],
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

    if (room.phase !== GamePhase.WAITING) {
      return { success: false, error: 'Game already started' }
    }

    if (room.players.size >= 8) {
      return { success: false, error: 'Room is full (max 8 players)' }
    }

    // Check if nickname is already taken
    for (const player of room.players.values()) {
      if (player.nickname === nickname) {
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
   * Remove a player from a room
   */
  removePlayer(code: string, playerId: string): { room?: Room; wasHost: boolean } {
    const room = this.rooms.get(code)

    if (!room) {
      return { wasHost: false }
    }

    const player = room.players.get(playerId)
    const wasHost = player?.isHost || false

    room.players.delete(playerId)
    room.lastActivityAt = Date.now()

    // If no players left or game hasn't started, delete room
    if (room.players.size === 0 || (room.phase === GamePhase.WAITING && room.players.size === 0)) {
      this.rooms.delete(code)
      console.log(`Room ${code} deleted (no players)`)
      return { wasHost }
    }

    // If host left, assign new host
    if (wasHost && room.players.size > 0) {
      const newHost = Array.from(room.players.values())[0]
      newHost.isHost = true
      room.hostId = newHost.id
      console.log(`New host assigned in room ${code}: ${newHost.nickname}`)
    }

    return { room, wasHost }
  }

  /**
   * Update player socket ID (for reconnection)
   */
  updatePlayerSocketId(code: string, playerId: string, socketId: string): boolean {
    const room = this.rooms.get(code)
    if (!room) return false

    const player = room.players.get(playerId)
    if (!player) return false

    player.socketId = socketId
    room.lastActivityAt = Date.now()

    return true
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
    return {
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      phase: room.phase,
      currentRound: room.currentRound,
      currentTurnIndex: room.currentTurnIndex,
      turnStartTime: room.turnStartTime,
      descriptions: room.descriptions,
      descriptionTime: room.descriptionTime,
      discussionTime: room.discussionTime,
      votes: room.phase === GamePhase.DISCUSSING ? Object.fromEntries(room.votes) : undefined,
      wordPairId: room.wordPairId,
      usedWordPairIds: room.usedWordPairIds,
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
