import prisma from './prisma'
import type { WordPair, WordPairStore } from './word-store'

export class PrismaWordPairStore implements WordPairStore {
  async findMany(options?: { enabledOnly?: boolean; excludeIds?: string[] }): Promise<WordPair[]> {
    const where: any = {}
    if (options?.enabledOnly) where.enabled = true
    if (options?.excludeIds?.length) where.id = { notIn: options.excludeIds }

    return prisma.wordPair.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByWords(wordA: string, wordB: string): Promise<WordPair | null> {
    return prisma.wordPair.findFirst({ where: { wordA, wordB } })
  }

  async create(data: { wordA: string; wordB: string }): Promise<WordPair> {
    return prisma.wordPair.create({ data })
  }

  async createMany(data: { wordA: string; wordB: string }[]): Promise<number> {
    const result = await prisma.wordPair.createMany({ data })
    return result.count
  }

  async update(id: string, data: { wordA?: string; wordB?: string; enabled?: boolean }): Promise<WordPair | null> {
    try {
      return await prisma.wordPair.update({ where: { id }, data })
    } catch (error: any) {
      if (error.code === 'P2025') return null
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.wordPair.delete({ where: { id } })
      return true
    } catch (error: any) {
      if (error.code === 'P2025') return false
      throw error
    }
  }
}
