import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

// PUT /api/words/[id] - Update a word pair (admin only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { wordA, wordB, enabled } = body

    const updateData: any = {}

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

    const wordPair = await prisma.wordPair.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ wordPair })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Word pair not found' }, { status: 404 })
    }
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

    await prisma.wordPair.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Word pair not found' }, { status: 404 })
    }
    console.error('Error deleting word pair:', error)
    return NextResponse.json({ error: 'Failed to delete word pair' }, { status: 500 })
  }
}
