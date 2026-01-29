'use client'

import { useEffect, useState } from 'react'

interface TimerProps {
  startTime: number
  duration: number // in seconds
  onTimeout?: () => void
}

export function Timer({ startTime, duration, onTimeout }: TimerProps) {
  const [remaining, setRemaining] = useState(duration)

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const newRemaining = Math.max(0, duration - elapsed)

      setRemaining(newRemaining)

      if (newRemaining === 0 && onTimeout) {
        onTimeout()
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [startTime, duration, onTimeout])

  const isLow = remaining <= 5
  const percentage = (remaining / duration) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Time Remaining</span>
        <span className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
          {remaining}s
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            isLow ? 'bg-red-500' : 'bg-primary-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
