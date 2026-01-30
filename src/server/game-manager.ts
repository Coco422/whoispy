import { Room, Player, PlayerRole, GamePhase, Description, VoteResult, GameResult } from '@/types/game'
import { shuffle, randomItem, countVotes, getAlivePlayers, isSpy, ABSTAIN_VOTE_ID } from '@/lib/game/utils'
import { getWordPairStore } from '@/lib/db/word-store'

export class GameManager {
  private getAlivePlayersInTurnOrder(room: Room): Player[] {
    const order = room.turnOrder.length > 0 ? room.turnOrder : Array.from(room.players.keys())
    const alivePlayers: Player[] = []
    const seen = new Set<string>()

    for (const playerId of order) {
      const player = room.players.get(playerId)
      if (!player || !player.isAlive) continue
      alivePlayers.push(player)
      seen.add(playerId)
    }

    // Fallback: include any alive players not in order (should be rare)
    for (const player of room.players.values()) {
      if (!player.isAlive || seen.has(player.id)) continue
      alivePlayers.push(player)
    }

    return alivePlayers
  }

  private getTurnIndex(room: Room, aliveCount: number): number | null {
    if (aliveCount <= 0) return null
    if (room.currentTurnIndex < 0 || room.currentTurnIndex >= aliveCount) return null

    const isReverse = room.currentRound % 2 === 0
    return isReverse ? aliveCount - 1 - room.currentTurnIndex : room.currentTurnIndex
  }

  /**
   * Start a game in a room
   */
  async startGame(room: Room): Promise<{ success: boolean; error?: string }> {
    if (room.phase !== GamePhase.WAITING) {
      return { success: false, error: 'Game already started' }
    }

    if (room.players.size < 3) {
      return { success: false, error: 'Need at least 3 players to start' }
    }

    if (room.players.size > 8) {
      return { success: false, error: 'Maximum 8 players allowed' }
    }

    // Get enabled word pairs from database, excluding already used ones
    const store = await getWordPairStore()
    const wordPairs = await store.findMany({
      enabledOnly: true,
      excludeIds: room.usedWordPairIds,
    })

    // If no unused word pairs, reset the used list and fetch all enabled pairs
    if (wordPairs.length === 0) {
      console.log(`Room ${room.code}: All word pairs used, resetting history`)
      room.usedWordPairIds = []
      const allWordPairs = await store.findMany({ enabledOnly: true })

      if (allWordPairs.length === 0) {
        return { success: false, error: 'No word pairs available' }
      }

      const selectedPair = randomItem(allWordPairs)
      room.usedWordPairIds.push(selectedPair.id)
      this.assignRolesAndStartGame(room, selectedPair)
      return { success: true }
    }

    const selectedPair = randomItem(wordPairs)

    // Add selected pair to used list
    room.usedWordPairIds.push(selectedPair.id)

    this.assignRolesAndStartGame(room, selectedPair)
    return { success: true }
  }

  /**
   * Assign roles and start the game with selected word pair
   */
  private assignRolesAndStartGame(
    room: Room,
    selectedPair: { id: string; wordA: string; wordB: string }
  ): void {
    // Assign roles: 1 spy, rest civilians
    const playerIds = Array.from(room.players.keys())
    const shuffledIds = shuffle(playerIds)
    room.turnOrder = shuffle(playerIds)

    const spyId = shuffledIds[0]
    const civilianIds = shuffledIds.slice(1)

    // Assign roles and words
    const spyPlayer = room.players.get(spyId)!
    spyPlayer.role = PlayerRole.SPY
    spyPlayer.word = selectedPair.wordB

    for (const civilianId of civilianIds) {
      const player = room.players.get(civilianId)!
      player.role = PlayerRole.CIVILIAN
      player.word = selectedPair.wordA
    }

    // Update room state
    room.phase = GamePhase.DESCRIBING
    room.currentRound = 1
    room.currentTurnIndex = 0
    room.turnStartTime = Date.now()
    room.descriptions = []
    room.votes.clear()
    room.wordPairId = selectedPair.id
    room.wordA = selectedPair.wordA
    room.wordB = selectedPair.wordB
    room.lastActivityAt = Date.now()

    console.log(`Game started in room ${room.code}. Spy: ${spyPlayer.nickname}`)
  }

  /**
   * Get the current turn player
   */
  getCurrentTurnPlayer(room: Room): Player | null {
    if (room.phase !== GamePhase.DESCRIBING) {
      return null
    }

    const alivePlayers = this.getAlivePlayersInTurnOrder(room)

    const index = this.getTurnIndex(room, alivePlayers.length)
    return index === null ? null : alivePlayers[index]
  }

  /**
   * Submit a description for the current turn
   */
  submitDescription(
    room: Room,
    playerId: string,
    text: string
  ): { success: boolean; error?: string; nextTurn?: boolean } {
    if (room.phase !== GamePhase.DESCRIBING) {
      return { success: false, error: 'Not in description phase' }
    }

    const player = room.players.get(playerId)
    if (!player || !player.isAlive) {
      return { success: false, error: 'Player not found or not alive' }
    }

    const currentPlayer = this.getCurrentTurnPlayer(room)
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' }
    }

    // Validate description
    if (!text || text.trim().length === 0) {
      return { success: false, error: 'Description cannot be empty' }
    }

    if (text.length > 200) {
      return { success: false, error: 'Description too long (max 200 characters)' }
    }

    // Add description
    const description: Description = {
      playerId,
      nickname: player.nickname,
      text: text.trim(),
      round: room.currentRound,
      timestamp: Date.now(),
    }

    room.descriptions.push(description)
    room.lastActivityAt = Date.now()

    // Move to next turn
    const nextTurn = this.advanceTurn(room)

    return { success: true, nextTurn }
  }

  /**
   * Advance to the next turn or phase
   */
  advanceTurn(room: Room): boolean {
    if (room.phase !== GamePhase.DESCRIBING) {
      return false
    }

    const alivePlayers = this.getAlivePlayersInTurnOrder(room)
    room.currentTurnIndex++

    // If all players have described, move to discussing phase
    if (room.currentTurnIndex >= alivePlayers.length) {
      room.phase = GamePhase.DISCUSSING
      room.turnStartTime = Date.now()
      console.log(`Room ${room.code} moved to discussing phase (${room.discussionTime}s)`)
      return false
    }

    // Update turn start time
    room.turnStartTime = Date.now()
    return true
  }

  /**
   * Start voting phase after discussion
   */
  startVoting(room: Room): void {
    if (room.phase !== GamePhase.DISCUSSING) {
      return
    }

    room.phase = GamePhase.VOTING
    room.turnStartTime = Date.now()
    room.votes.clear()
    console.log(`Room ${room.code} moved to voting phase`)
  }

  /**
   * Submit a vote (can be done during DISCUSSING or VOTING phase)
   */
  submitVote(
    room: Room,
    voterId: string,
    targetId: string
  ): { success: boolean; error?: string; allVoted?: boolean } {
    if (room.phase !== GamePhase.VOTING && room.phase !== GamePhase.DISCUSSING) {
      return { success: false, error: 'Not in voting or discussing phase' }
    }

    const voter = room.players.get(voterId)
    if (!voter || !voter.isAlive) {
      return { success: false, error: 'Voter not found or not alive' }
    }

    if (targetId !== ABSTAIN_VOTE_ID) {
      const target = room.players.get(targetId)
      if (!target || !target.isAlive) {
        return { success: false, error: 'Target not found or not alive' }
      }

      if (voterId === targetId) {
        return { success: false, error: 'Cannot vote for yourself' }
      }
    }

    // Record vote
    room.votes.set(voterId, targetId)
    room.lastActivityAt = Date.now()

    // Check if all alive players have voted
    const alivePlayers = getAlivePlayers(room.players)
    const allVoted = room.votes.size === alivePlayers.length

    return { success: true, allVoted }
  }

  /**
   * Process voting results and eliminate player
   */
  processVotes(room: Room): VoteResult & { eliminatedNickname?: string } {
    if (room.phase !== GamePhase.VOTING && room.phase !== GamePhase.DISCUSSING) {
      throw new Error('Not in voting or discussing phase')
    }

    const { voteCounts, eliminatedId } = countVotes(room.votes)

    let isSpyEliminated = false
    let eliminatedNickname: string | undefined

    // Eliminate player if not a tie
    if (eliminatedId) {
      const eliminated = room.players.get(eliminatedId)
      if (eliminated) {
        eliminated.isAlive = false
        eliminatedNickname = eliminated.nickname
        isSpyEliminated = eliminated.role === PlayerRole.SPY
        console.log(`Player eliminated in room ${room.code}: ${eliminatedNickname} (Spy: ${isSpyEliminated})`)
      }
    }

    // Move to result phase
    room.phase = GamePhase.RESULT
    room.lastActivityAt = Date.now()

    return {
      eliminatedPlayerId: eliminatedId,
      voteCounts,
      isSpyEliminated,
      eliminatedNickname,
    }
  }

  /**
   * Check win conditions
   */
  checkWinCondition(room: Room): GameResult | null {
    const alivePlayers = getAlivePlayers(room.players)

    // Find spy
    let spyPlayer: Player | null = null
    for (const player of room.players.values()) {
      if (player.role === PlayerRole.SPY) {
        spyPlayer = player
        break
      }
    }

    if (!spyPlayer) {
      return null
    }

    // Check if spy is eliminated - civilians win
    if (!spyPlayer.isAlive) {
      return {
        winner: 'civilians',
        spyId: spyPlayer.id,
        spyNickname: spyPlayer.nickname,
        wordA: room.wordA!,
        wordB: room.wordB!,
        rounds: room.currentRound,
      }
    }

    // Spy wins when they reach parity (i.e. only 1 civilian left with 1 spy).
    // With a single spy, that means 2 players remaining.
    if (alivePlayers.length <= 2) {
      return {
        winner: 'spy',
        spyId: spyPlayer.id,
        spyNickname: spyPlayer.nickname,
        wordA: room.wordA!,
        wordB: room.wordB!,
        rounds: room.currentRound,
      }
    }

    // Game continues
    return null
  }

  /**
   * Start next round
   */
  startNextRound(room: Room): void {
    room.phase = GamePhase.DESCRIBING
    room.currentRound++
    room.currentTurnIndex = 0
    room.turnStartTime = Date.now()
    room.votes.clear()
    room.lastActivityAt = Date.now()

    console.log(`Room ${room.code} started round ${room.currentRound}`)
  }

  /**
   * End the game (keep players in room)
   */
  endGame(room: Room, result: GameResult): void {
    room.phase = GamePhase.ENDED
    room.lastGameResult = result
    room.lastActivityAt = Date.now()

    // Reset all players' ready status
    for (const player of room.players.values()) {
      player.isReady = false
    }

    console.log(`Game ended in room ${room.code}. Winner: ${result.winner}`)
  }

  /**
   * Toggle player ready status
   */
  toggleReady(room: Room, playerId: string): { success: boolean; error?: string; allReady?: boolean } {
    if (room.phase !== GamePhase.ENDED) {
      return { success: false, error: 'Game not ended yet' }
    }

    const player = room.players.get(playerId)
    if (!player) {
      return { success: false, error: 'Player not found' }
    }

    player.isReady = !player.isReady
    room.lastActivityAt = Date.now()

    // Check if all players are ready
    const allReady = Array.from(room.players.values()).every(p => p.isReady)

    return { success: true, allReady }
  }

  /**
   * Reset room to waiting state (for next game)
   */
  resetRoom(room: Room): void {
    room.phase = GamePhase.WAITING
    room.currentRound = 0
    room.currentTurnIndex = 0
    room.turnOrder = []
    room.turnStartTime = null
    room.descriptions = []
    room.votes.clear()
    room.wordPairId = null
    room.wordA = null
    room.wordB = null
    room.lastGameResult = null
    // DON'T reset usedWordPairIds - keep history across games in same room
    room.lastActivityAt = Date.now()

    // Reset all players
    for (const player of room.players.values()) {
      player.role = null
      player.word = null
      player.isAlive = true
      player.isReady = false
    }

    console.log(`Room ${room.code} reset to waiting state`)
  }
}

// Singleton instance
export const gameManager = new GameManager()
