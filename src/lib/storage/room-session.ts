'use client'

const STORAGE_KEY = 'whoispy:roomSession:v1'

export type StoredRoomSession = {
  roomCode: string
  nickname?: string
  updatedAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toStoredRoomSession(value: unknown): StoredRoomSession | null {
  if (!isRecord(value)) return null

  const roomCode = normalizeString(value.roomCode)
  if (!roomCode) return null

  const nickname = normalizeString(value.nickname) || undefined

  const updatedAt =
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : Date.now()

  return { roomCode, nickname, updatedAt }
}

export function getStoredRoomSession(): StoredRoomSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return toStoredRoomSession(safeJsonParse(raw))
}

export function setStoredRoomSession(session: { roomCode: string; nickname?: string }) {
  if (typeof window === 'undefined') return
  const roomCode = session.roomCode.trim()
  if (!roomCode) return

  const payload: StoredRoomSession = {
    roomCode,
    nickname: session.nickname?.trim() || undefined,
    updatedAt: Date.now(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredRoomSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function clearStoredRoomSessionIfMatches(roomCode: string) {
  const session = getStoredRoomSession()
  if (!session) return
  if (session.roomCode !== roomCode) return
  clearStoredRoomSession()
}

