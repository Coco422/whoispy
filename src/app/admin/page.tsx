'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface WordPair {
  id: string
  wordA: string
  wordB: string
  enabled: boolean
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [wordPairs, setWordPairs] = useState<WordPair[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [newWordA, setNewWordA] = useState('')
  const [newWordB, setNewWordB] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWordA, setEditWordA] = useState('')
  const [editWordB, setEditWordB] = useState('')

  // Batch import state
  const [batchInput, setBatchInput] = useState('')
  const [batchResult, setBatchResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)

  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

  useEffect(() => {
    if (isAuthenticated) {
      fetchWordPairs()
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === adminPassword) {
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Invalid password')
    }
  }

  const fetchWordPairs = async () => {
    try {
      const response = await fetch('/api/words')
      const data = (await response.json()) as { wordPairs: WordPair[] }
      setWordPairs(data.wordPairs)
    } catch (error) {
      console.error('Error fetching word pairs:', error)
      setError('Failed to load word pairs')
    }
  }

  const handleAddWordPair = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ wordA: newWordA, wordB: newWordB }),
      })

      if (response.ok) {
        setNewWordA('')
        setNewWordB('')
        fetchWordPairs()
      } else {
        const data = (await response.json()) as { error?: string }
        setError(data.error || 'Failed to add word pair')
      }
    } catch (error) {
      setError('Failed to add word pair')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateWordPair = async (id: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/words/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ wordA: editWordA, wordB: editWordB }),
      })

      if (response.ok) {
        setEditingId(null)
        setEditWordA('')
        setEditWordB('')
        fetchWordPairs()
      } else {
        const data = (await response.json()) as { error?: string }
        setError(data.error || 'Failed to update word pair')
      }
    } catch (error) {
      setError('Failed to update word pair')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/words/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ enabled: !enabled }),
      })

      if (response.ok) {
        fetchWordPairs()
      }
    } catch (error) {
      console.error('Error toggling word pair:', error)
    }
  }

  const handleDeleteWordPair = async (id: string) => {
    if (!confirm('Are you sure you want to delete this word pair?')) {
      return
    }

    try {
      const response = await fetch(`/api/words/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminPassword}`,
        },
      })

      if (response.ok) {
        fetchWordPairs()
      }
    } catch (error) {
      console.error('Error deleting word pair:', error)
    }
  }

  const startEdit = (wordPair: WordPair) => {
    setEditingId(wordPair.id)
    setEditWordA(wordPair.wordA)
    setEditWordB(wordPair.wordB)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditWordA('')
    setEditWordB('')
  }

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setBatchResult(null)

    try {
      // Parse input: each line should be "词A, 词B"
      const lines = batchInput.split('\n').filter((line) => line.trim())
      const pairs = lines
        .map((line, index) => {
          const parts = line.split(',').map((p) => p.trim())
          if (parts.length !== 2) {
            return null
          }
          return {
            wordA: parts[0],
            wordB: parts[1],
          }
        })
        .filter((pair) => pair !== null)

      if (pairs.length === 0) {
        setError('没有有效的词语对。格式：词A, 词B（每行一个）')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/words/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ pairs }),
      })

      const data = (await response.json()) as { imported?: number; skipped?: number; errors?: string[]; error?: string }

      if (response.ok) {
        setBatchResult({
          imported: data.imported ?? 0,
          skipped: data.skipped ?? 0,
          errors: data.errors || [],
        })
        setBatchInput('')
        fetchWordPairs()
      } else {
        setError(data.error || '批量导入失败')
      }
    } catch (error) {
      setError('批量导入失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card title="管理员登录" className="max-w-md w-full">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入管理员密码"
              error={error}
              autoFocus
            />
            <div className="flex gap-3">
              <Button type="submit" variant="primary" size="lg" className="flex-1">
                登录
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => router.push('/')}
              >
                返回
              </Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理面板</h1>
          <Button variant="secondary" onClick={() => router.push('/')}>
            返回首页
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Add new word pair */}
        <Card title="添加新词语对" className="mb-8">
          <form onSubmit={handleAddWordPair} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="平民词语 (wordA)"
                type="text"
                value={newWordA}
                onChange={(e) => setNewWordA(e.target.value)}
                placeholder="例如: 橙子"
                maxLength={50}
              />
              <Input
                label="卧底词语 (wordB)"
                type="text"
                value={newWordB}
                onChange={(e) => setNewWordB(e.target.value)}
                placeholder="例如: 橘子"
                maxLength={50}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!newWordA || !newWordB || isLoading}
            >
              {isLoading ? '添加中...' : '添加词语对'}
            </Button>
          </form>
        </Card>

        {/* Batch import word pairs */}
        <Card title="批量导入词语对" className="mb-8">
          <form onSubmit={handleBatchImport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                词语对列表（每行一个，格式：词A, 词B）
              </label>
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="例如：&#10;橙子, 橘子&#10;西瓜, 哈密瓜&#10;苹果, 梨"
                className="w-full h-40 px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-vertical"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" variant="primary" disabled={!batchInput.trim() || isLoading}>
              {isLoading ? '导入中...' : '批量导入'}
            </Button>

            {/* Batch import result */}
            {batchResult && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">导入结果</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>成功导入: {batchResult.imported} 个</p>
                  <p>跳过（已存在或重复）: {batchResult.skipped} 个</p>
                  {batchResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-700">错误:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {batchResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </Card>

        {/* Word pairs list */}
        <Card title={`词语对 (${wordPairs.length})`}>
          <div className="space-y-3">
            {wordPairs.map((pair) => (
              <div
                key={pair.id}
                className={`p-4 rounded-lg border ${
                  pair.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
                }`}
              >
                {editingId === pair.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={editWordA}
                        onChange={(e) => setEditWordA(e.target.value)}
                        placeholder="平民词语"
                      />
                      <Input
                        value={editWordB}
                        onChange={(e) => setEditWordB(e.target.value)}
                        placeholder="卧底词语"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleUpdateWordPair(pair.id)}
                        disabled={isLoading}
                      >
                        保存
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{pair.wordA}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="font-medium text-gray-900">{pair.wordB}</span>
                        {!pair.enabled && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                            已禁用
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={pair.enabled ? 'secondary' : 'primary'}
                        onClick={() => handleToggleEnabled(pair.id, pair.enabled)}
                      >
                        {pair.enabled ? '禁用' : '启用'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(pair)}>
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteWordPair(pair.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {wordPairs.length === 0 && (
              <p className="text-center text-gray-500 py-8">还没有词语对</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
