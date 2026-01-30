import { NextRequest, NextResponse } from 'next/server'
import { getWordPairStore } from '@/lib/db/word-store'

// GET /api/words - Get all word pairs (with optional filter)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const enabledOnly = searchParams.get('enabled') === 'true'

    const store = await getWordPairStore()
    const wordPairs = await store.findMany({ enabledOnly })

    return NextResponse.json({ wordPairs })
  } catch (error) {
    console.error('Error fetching word pairs:', error)
    return NextResponse.json({ error: 'Failed to fetch word pairs' }, { status: 500 })
  }
}

// POST /api/words - Create a new word pair (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { wordA?: string; wordB?: string }
    const { wordA, wordB } = body

    if (!wordA || !wordB) {
      return NextResponse.json({ error: 'Both wordA and wordB are required' }, { status: 400 })
    }

    if (wordA.trim().length === 0 || wordB.trim().length === 0) {
      return NextResponse.json({ error: 'Words cannot be empty' }, { status: 400 })
    }

    if (wordA.length > 50 || wordB.length > 50) {
      return NextResponse.json({ error: 'Words must be 50 characters or less' }, { status: 400 })
    }

    const store = await getWordPairStore()
    const wordPair = await store.create({
      wordA: wordA.trim(),
      wordB: wordB.trim(),
    })

    return NextResponse.json({ wordPair }, { status: 201 })
  } catch (error) {
    console.error('Error creating word pair:', error)
    return NextResponse.json({ error: 'Failed to create word pair' }, { status: 500 })
  }
}
