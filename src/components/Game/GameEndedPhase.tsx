'use client'

import { Player, GameResult } from '@/types/game'
import { Button } from '../ui/Button'

interface GameEndedPhaseProps {
  result: GameResult
  players: Player[]
  currentPlayerId: string
  isSpectator?: boolean
  onToggleReady: () => void
  onRestartGame: () => void
}

export function GameEndedPhase({
  result,
  players,
  currentPlayerId,
  isSpectator = false,
  onToggleReady,
  onRestartGame,
}: GameEndedPhaseProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isHost = currentPlayer?.isHost || false
  const readyPlayers = players.filter(p => p.isReady)
  const allReady = players.every(p => p.isReady)

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Game Result */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">
          {result.winner === 'spy' ? '🕵️ 卧底获胜!' : '👥 平民获胜!'}
        </h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg mb-2">
            卧底是：<span className="font-bold text-red-600">{result.spyNickname}</span>
          </p>
          <div className="flex justify-center gap-8 mt-4">
            <div>
              <p className="text-sm text-gray-600">平民词语</p>
              <p className="text-xl font-bold text-blue-600">{result.wordA}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">卧底词语</p>
              <p className="text-xl font-bold text-red-600">{result.wordB}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">共进行了 {result.rounds} 回合</p>
        </div>

        {/* Ready Status */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-4">准备下一局</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {players.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border ${
                  player.isReady
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {player.nickname}
                    {player.id === currentPlayerId && (
                      <span className="text-xs ml-1 text-gray-500">(你)</span>
                    )}
                    {player.isHost && (
                      <span className="text-xs ml-1 text-blue-600">(房主)</span>
                    )}
                  </span>
                  {player.isReady ? (
                    <span className="text-green-600 font-bold">✓ 已准备</span>
                  ) : (
                    <span className="text-gray-400">未准备</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-600 mb-4">
            {allReady ? (
              <span className="text-green-600 font-semibold">
                ✓ 全员已准备！房主可以开始下一局
              </span>
            ) : (
              <span>
                已准备：{readyPlayers.length} / {players.length}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onToggleReady}
              variant={currentPlayer?.isReady ? 'secondary' : 'primary'}
              size="lg"
              disabled={isSpectator || !currentPlayer}
            >
              {currentPlayer?.isReady ? '取消准备' : '准备'}
            </Button>

            {isHost && (
              <Button
                onClick={onRestartGame}
                variant="primary"
                size="lg"
                disabled={!allReady}
              >
                开始下一局
              </Button>
            )}
          </div>

          {isHost && !allReady && (
            <p className="text-sm text-gray-500 mt-2">
              等待所有玩家准备后才能开始下一局
            </p>
          )}

          {isSpectator && (
            <p className="text-sm text-gray-500 mt-2">
              你在观战席，等待空位加入下一局（有人离开后将按加入顺序自动补位）。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
