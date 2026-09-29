import { useRef, useState } from 'react'
import type React from 'react'

/**
 * iOS-style edge-swipe-back. Attach `handlers` to a full-screen overlay and
 * apply `style` to it: a drag starting at the left edge tracks the finger,
 * releases past the threshold call `onBack`, short drags spring back.
 */
export function useSwipeBack(onBack: () => void) {
  const [dx, setDx] = useState(0)
  const dxRef = useRef(0)
  const start = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })

  const set = (v: number) => {
    dxRef.current = v
    setDx(v)
  }

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY, active: t.clientX < 36 }
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!start.current.active) return
      const t = e.touches[0]
      const d = t.clientX - start.current.x
      // mostly-vertical movement: hand the gesture back to scrolling
      if (Math.abs(t.clientY - start.current.y) > 90 && d < 40) {
        start.current.active = false
        set(0)
        return
      }
      set(Math.max(0, d))
    },
    onTouchEnd: () => {
      if (!start.current.active) return
      start.current.active = false
      const d = dxRef.current
      set(0)
      if (d > 90) onBack()
    },
    onTouchCancel: () => {
      start.current.active = false
      set(0)
    }
  }

  const style: React.CSSProperties = dx
    ? { transform: `translateX(${dx}px)`, transition: 'none' }
    : { transition: 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1)' }

  return { handlers, style, swiping: dx > 0 }
}
