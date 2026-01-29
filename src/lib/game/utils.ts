/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Select a random item from an array
 */
export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Generate a random room code (6-digit numeric)
 */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Count votes and determine elimination
 * Returns the player ID with the most votes, or null if tie
 */
export function countVotes(votes: Map<string, string>): {
  voteCounts: Record<string, number>
  eliminatedId: string | null
} {
  const voteCounts: Record<string, number> = {}

  // Count votes for each target
  for (const targetId of votes.values()) {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
  }

  // Find player(s) with highest vote count
  let maxVotes = 0
  let eliminatedId: string | null = null
  const playersWithMaxVotes: string[] = []

  for (const [playerId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count
      eliminatedId = playerId
      playersWithMaxVotes.length = 0
      playersWithMaxVotes.push(playerId)
    } else if (count === maxVotes) {
      playersWithMaxVotes.push(playerId)
    }
  }

  // If tie, no elimination (simplified rule)
  if (playersWithMaxVotes.length > 1) {
    eliminatedId = null
  }

  return { voteCounts, eliminatedId }
}

/**
 * Get alive players from a room
 */
export function getAlivePlayers<T extends { isAlive: boolean }>(players: Map<string, T>): T[] {
  return Array.from(players.values()).filter((p) => p.isAlive)
}

/**
 * Check if a player is the spy
 */
export function isSpy(playerId: string, players: Map<string, { id: string; role: string }>): boolean {
  const player = players.get(playerId)
  return player?.role === 'spy'
}

/**
 * Validate nickname
 */
export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, error: 'Nickname cannot be empty' }
  }

  if (nickname.length > 20) {
    return { valid: false, error: 'Nickname must be 20 characters or less' }
  }

  // Check for valid characters (alphanumeric, spaces, and common unicode)
  if (!/^[\p{L}\p{N}\s]+$/u.test(nickname)) {
    return { valid: false, error: 'Nickname contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Validate room code
 */
export function validateRoomCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.length !== 6) {
    return { valid: false, error: 'Room code must be 6 digits' }
  }

  if (!/^\d{6}$/.test(code)) {
    return { valid: false, error: 'Room code must contain only numbers' }
  }

  return { valid: true }
}
