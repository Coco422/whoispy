import { v4 as uuidv4 } from 'uuid'
import type { WordPair, WordPairStore } from './word-store'

/**
 * Cloudflare KV-based word pair store.
 *
 * Data layout in KV:
 *   key: "wordpair:{id}"  → value: JSON WordPair
 *   key: "wordpairs:ids"  → value: JSON string[] (list of all IDs)
 *
 * Requires KV namespace binding passed via environment.
 * In Cloudflare Workers, the binding is available as `env.WORD_PAIRS_KV`.
 * For local dev with wrangler, use `--kv` flag.
 */
export class KVWordPairStore implements WordPairStore {
  private kv: KVNamespace

  constructor(kv?: KVNamespace) {
    if (kv) {
      this.kv = kv
    } else {
      // In Cloudflare Workers runtime, the binding is on the global env
      const globalKV = (globalThis as any).WORD_PAIRS_KV
      if (!globalKV) {
        throw new Error('WORD_PAIRS_KV namespace not found. Ensure KV binding is configured.')
      }
      this.kv = globalKV
    }
  }

  private key(id: string): string {
    return `wordpair:${id}`
  }

  private async getAllIds(): Promise<string[]> {
    const raw = await this.kv.get('wordpairs:ids')
    if (!raw) return []
    return JSON.parse(raw) as string[]
  }

  private async setAllIds(ids: string[]): Promise<void> {
    await this.kv.put('wordpairs:ids', JSON.stringify(ids))
  }

  async findMany(options?: { enabledOnly?: boolean; excludeIds?: string[] }): Promise<WordPair[]> {
    const ids = await this.getAllIds()
    const excludeSet = new Set(options?.excludeIds || [])

    const results: WordPair[] = []
    // Fetch in parallel batches of 50
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50).filter(id => !excludeSet.has(id))
      const items = await Promise.all(
        batch.map(async (id) => {
          const raw = await this.kv.get(this.key(id))
          if (!raw) return null
          return JSON.parse(raw) as WordPair
        })
      )
      for (const item of items) {
        if (!item) continue
        if (options?.enabledOnly && !item.enabled) continue
        results.push(item)
      }
    }

    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return results
  }

  async findByWords(wordA: string, wordB: string): Promise<WordPair | null> {
    const all = await this.findMany()
    return all.find(wp => wp.wordA === wordA && wp.wordB === wordB) || null
  }

  async create(data: { wordA: string; wordB: string }): Promise<WordPair> {
    const wp: WordPair = {
      id: uuidv4(),
      wordA: data.wordA,
      wordB: data.wordB,
      enabled: true,
      createdAt: new Date(),
    }

    await this.kv.put(this.key(wp.id), JSON.stringify(wp))

    const ids = await this.getAllIds()
    ids.push(wp.id)
    await this.setAllIds(ids)

    return wp
  }

  async createMany(data: { wordA: string; wordB: string }[]): Promise<number> {
    const ids = await this.getAllIds()
    let count = 0

    for (const item of data) {
      const wp: WordPair = {
        id: uuidv4(),
        wordA: item.wordA,
        wordB: item.wordB,
        enabled: true,
        createdAt: new Date(),
      }
      await this.kv.put(this.key(wp.id), JSON.stringify(wp))
      ids.push(wp.id)
      count++
    }

    await this.setAllIds(ids)
    return count
  }

  async update(id: string, data: { wordA?: string; wordB?: string; enabled?: boolean }): Promise<WordPair | null> {
    const raw = await this.kv.get(this.key(id))
    if (!raw) return null

    const wp = JSON.parse(raw) as WordPair
    if (data.wordA !== undefined) wp.wordA = data.wordA
    if (data.wordB !== undefined) wp.wordB = data.wordB
    if (data.enabled !== undefined) wp.enabled = data.enabled

    await this.kv.put(this.key(id), JSON.stringify(wp))
    return wp
  }

  async delete(id: string): Promise<boolean> {
    const raw = await this.kv.get(this.key(id))
    if (!raw) return false

    await this.kv.delete(this.key(id))

    const ids = await this.getAllIds()
    await this.setAllIds(ids.filter(i => i !== id))
    return true
  }
}
