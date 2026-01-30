import { NextRequest, NextResponse } from 'next/server'
import { getWordPairStore } from '@/lib/db/word-store'

// PUT /api/words/[id] - Update a word pair (admin only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { wordA?: string; wordB?: string; enabled?: boolean }
    const { wordA, wordB, enabled } = body

    const updateData: { wordA?: string; wordB?: string; enabled?: boolean } = {}

    if (wordA !== undefined) {
      if (wordA.trim().length === 0) {
        return NextResponse.json({ error: 'wordA cannot be empty' }, { status: 400 })
      }
      if (wordA.length > 50) {
        return NextResponse.json({ error: 'wordA must be 50 characters or less' }, { status: 400 })
      }
      updateData.wordA = wordA.trim()
    }

    if (wordB !== undefined) {
      if (wordB.trim().length === 0) {
        return NextResponse.json({ error: 'wordB cannot be empty' }, { status: 400 })
      }
      if (wordB.length > 50) {
        return NextResponse.json({ error: 'wordB must be 50 characters or less' }, { status: 400 })
      }
      updateData.wordB = wordB.trim()
    }

    if (enabled !== undefined) {
      updateData.enabled = Boolean(enabled)
    }

    const store = await getWordPairStore()
    const wordPair = await store.update(params.id, updateData)

    if (!wordPair) {
      return NextResponse.json({ error: 'Word pair not found' }, { status: 404 })
    }

    return NextResponse.json({ wordPair })
  } catch (error) {
    console.error('Error updating word pair:', error)
    return NextResponse.json({ error: 'Failed to update word pair' }, { status: 500 })
  }
}

// DELETE /api/words/[id] - Delete a word pair (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const store = await getWordPairStore()
    const deleted = await store.delete(params.id)

    if (!deleted) {
      return NextResponse.json({ error: 'Word pair not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting word pair:', error)
    return NextResponse.json({ error: 'Failed to delete word pair' }, { status: 500 })
  }
}
