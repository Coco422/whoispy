'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { getSocket } from './client'

export function useSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Attach listeners before effects that trigger socket.connect() run,
  // so we don't miss early events like the initial room_update on refresh/reconnect.
  useLayoutEffect(() => {
    const socket = getSocket()

    const handler = (data: T) => {
      callbackRef.current(data)
    }

    socket.on(event as any, handler)

    return () => {
      socket.off(event as any, handler)
    }
  }, [event])
}

export function useSocket() {
  return getSocket()
}
