/**
 * WordPair data model (DB-agnostic)
 */
export interface WordPair {
  id: string
  wordA: string
  wordB: string
  enabled: boolean
  createdAt: Date
}

/**
 * Abstract word pair store interface.
 * Implementations: PrismaWordPairStore (SQLite), KVWordPairStore (Cloudflare KV)
 */
export interface WordPairStore {
  /** Get all word pairs, optionally filtered by enabled status */
  findMany(options?: { enabledOnly?: boolean; excludeIds?: string[] }): Promise<WordPair[]>

  /** Find a single word pair by wordA + wordB */
  findByWords(wordA: string, wordB: string): Promise<WordPair | null>

  /** Create a single word pair */
  create(data: { wordA: string; wordB: string }): Promise<WordPair>

  /** Create multiple word pairs at once */
  createMany(data: { wordA: string; wordB: string }[]): Promise<number>

  /** Update a word pair by ID */
  update(id: string, data: { wordA?: string; wordB?: string; enabled?: boolean }): Promise<WordPair | null>

  /** Delete a word pair by ID */
  delete(id: string): Promise<boolean>
}

// Singleton store instance
let store: WordPairStore | null = null

/**
 * Get the word pair store (creates on first call).
 * Uses KV if CLOUDFLARE_KV is set, otherwise Prisma/SQLite.
 */
export async function getWordPairStore(): Promise<WordPairStore> {
  if (store) return store

  if (process.env.WORD_STORE === 'kv') {
    const { KVWordPairStore } = await import('./kv-word-store')
    store = new KVWordPairStore()
  } else {
    const { PrismaWordPairStore } = await import('./prisma-word-store')
    store = new PrismaWordPairStore()
  }

  return store
}
