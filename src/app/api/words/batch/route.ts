import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

// POST /api/words/batch - Batch import word pairs (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pairs } = body

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: 'pairs must be a non-empty array' }, { status: 400 })
    }

    // Validate and deduplicate pairs
    const validPairs: Array<{ wordA: string; wordB: string }> = []
    const seen = new Set<string>()
    const errors: string[] = []

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]

      if (!pair.wordA || !pair.wordB) {
        errors.push(`行 ${i + 1}: 缺少词语`)
        continue
      }

      const wordA = pair.wordA.trim()
      const wordB = pair.wordB.trim()

      if (wordA.length === 0 || wordB.length === 0) {
        errors.push(`行 ${i + 1}: 词语不能为空`)
        continue
      }

      if (wordA.length > 50 || wordB.length > 50) {
        errors.push(`行 ${i + 1}: 词语过长（最多50字符）`)
        continue
      }

      // Create unique key for deduplication
      const key = `${wordA}|${wordB}`
      if (seen.has(key)) {
        continue // Skip duplicate
      }

      // Check if already exists in database
      const existing = await prisma.wordPair.findFirst({
        where: {
          wordA,
          wordB,
        },
      })

      if (existing) {
        continue // Skip existing
      }

      seen.add(key)
      validPairs.push({ wordA, wordB })
    }

    // Batch insert
    if (validPairs.length > 0) {
      await prisma.wordPair.createMany({
        data: validPairs,
      })
    }

    return NextResponse.json({
      success: true,
      imported: validPairs.length,
      skipped: pairs.length - validPairs.length,
      errors,
    })
  } catch (error) {
    console.error('Error batch importing word pairs:', error)
    return NextResponse.json({ error: 'Failed to import word pairs' }, { status: 500 })
  }
}
