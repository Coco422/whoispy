'use client'

import { useRouter } from 'next/navigation'
import { Button } from '../ui/Button'
import { useEffect, useState } from 'react'

export function RoomNotFound() {
  const router = useRouter()
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; delay: number }>>([])

  useEffect(() => {
    // Generate random stars
    const starArray = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
    }))
    setStars(starArray)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated stars background */}
      <div className="absolute inset-0">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glowing moon */}
      <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-yellow-200 opacity-30 blur-2xl animate-pulse" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl">
        {/* Astronaut emoji with floating animation */}
        <div className="text-8xl mb-8 animate-bounce">
          🧑‍🚀
        </div>

        {/* Main message */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 animate-fade-in">
          你来到了宇宙边缘
        </h1>

        <div className="text-xl md:text-2xl text-purple-200 mb-8 space-y-2">
          <p className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            这个房间在浩瀚的星海中迷失了...
          </p>
          <p className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            也许它从未存在
          </p>
          <p className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            也许它已化作星尘
          </p>
        </div>

        {/* 404 styled as coordinates */}
        <div className="text-6xl font-mono text-purple-400 mb-8 tracking-wider animate-fade-in" style={{ animationDelay: '0.8s' }}>
          [ 404 ]
        </div>

        <div className="text-lg text-purple-300 mb-8 italic animate-fade-in" style={{ animationDelay: '1s' }}>
          "在无尽的虚空中，有些地方注定无法抵达"
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '1.2s' }}>
          <Button
            onClick={() => router.push('/')}
            variant="primary"
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/50"
          >
            🚀 返回地球
          </Button>
          <Button
            onClick={() => router.back()}
            variant="secondary"
            size="lg"
            className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/30"
          >
            ⏮️ 返回上一站
          </Button>
        </div>

        {/* Floating particles */}
        <div className="mt-12 flex justify-center gap-8 text-4xl animate-fade-in" style={{ animationDelay: '1.4s' }}>
          <span className="animate-float" style={{ animationDelay: '0s' }}>✨</span>
          <span className="animate-float" style={{ animationDelay: '0.5s' }}>🌙</span>
          <span className="animate-float" style={{ animationDelay: '1s' }}>⭐</span>
          <span className="animate-float" style={{ animationDelay: '1.5s' }}>🪐</span>
          <span className="animate-float" style={{ animationDelay: '2s' }}>☄️</span>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  )
}
