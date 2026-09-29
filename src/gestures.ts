import { useRef, useState } from 'react'
import type React from 'react'

/** Below this, a touch is a tap or a scroll — not a swipe. */
const INTENT_PX = 10
/** Horizontal movement must beat vertical by this factor to claim the gesture. */
const AXIS_RATIO = 1.4

/**
 * Finger-tracking tab swipe. The old version waited for a 60px threshold and
 * then jumped, so the gesture gave no feedback until it was already over. This
 * moves the view with the finger and commits on release, which is what makes a
 * swipe feel like it's dragging a surface rather than firing a shortcut.
 *
 * Only the active tab is rendered, so there's no neighbour to drag in behind;
 * the view itself translates and the commit hands off to the existing slide
 * animation. At the ends of the tab list the drag is damped rather than
 * blocked, so the edge is felt instead of hit.
 */
export function useTabSwipe({
  canGoNext,
  canGoPrev,
  onCommit
}: {
  canGoNext: boolean
  canGoPrev: boolean
  onCommit: (dir: 1 | -1) => void
}) {
  const [dx, setDx] = useState(0)
  const dxRef = useRef(0)
  const start = useRef<{ x: number; y: number; skip: boolean; claimed: boolean } | null>(null)

  const set = (v: number) => {
    dxRef.current = v
    setDx(v)
  }

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      const el = e.target as Element
      start.current = {
        x: t.clientX,
        y: t.clientY,
        // never hijack horizontal scrollers, text entry, full-screen flows,
        // the tab bar's own scrubber, or a row that has its own swipe action
        skip: !!el.closest('.actor-row, input, textarea, .overlay, .tabbar, .swipe-row'),
        claimed: false
      }
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = start.current
      if (!s || s.skip) return
      const t = e.touches[0]
      const raw = t.clientX - s.x
      const dy = t.clientY - s.y

      if (!s.claimed) {
        if (Math.abs(raw) < INTENT_PX) return
        // vertical intent wins: let the list scroll and stay out of the way
        if (Math.abs(raw) < Math.abs(dy) * AXIS_RATIO) {
          s.skip = true
          return
        }
        s.claimed = true
      }

      // damp toward a wall when there's nowhere to go in that direction
      const blocked = raw < 0 ? !canGoNext : !canGoPrev
      set(blocked ? raw * 0.22 : raw)
    },
    onTouchEnd: () => {
      const s = start.current
      start.current = null
      if (!s || s.skip || !s.claimed) return
      const d = dxRef.current
      set(0)
      if (d <= -70 && canGoNext) onCommit(1)
      else if (d >= 70 && canGoPrev) onCommit(-1)
    },
    onTouchCancel: () => {
      start.current = null
      set(0)
    }
  }

  const style: React.CSSProperties = dx
    ? { transform: `translateX(${dx}px)`, transition: 'none' }
    : {}

  return { handlers, style, dragging: dx !== 0 }
}

/**
 * iOS swipe-actions on a list row: drag left to reveal a destructive action,
 * release to settle open or closed. Dragging right from closed does nothing,
 * and pulling past the action's width is rubber-banded.
 */
export function useSwipeRow(actionWidth = 92) {
  const [x, setX] = useState(0)
  const xRef = useRef(0)
  const openRef = useRef(false)
  const start = useRef<{ x: number; y: number; base: number; claimed: boolean; skip: boolean } | null>(
    null
  )

  const set = (v: number) => {
    xRef.current = v
    setX(v)
  }
  const close = () => {
    openRef.current = false
    set(0)
  }

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      start.current = {
        x: t.clientX,
        y: t.clientY,
        base: openRef.current ? -actionWidth : 0,
        claimed: false,
        skip: false
      }
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = start.current
      if (!s || s.skip) return
      const t = e.touches[0]
      const raw = t.clientX - s.x
      const dy = t.clientY - s.y

      if (!s.claimed) {
        if (Math.abs(raw) < INTENT_PX) return
        if (Math.abs(raw) < Math.abs(dy) * AXIS_RATIO) {
          s.skip = true
          return
        }
        s.claimed = true
      }

      let next = s.base + raw
      if (next > 0) next *= 0.2 // nothing to reveal on the right
      if (next < -actionWidth) next = -actionWidth + (next + actionWidth) * 0.25
      set(next)
    },
    onTouchEnd: () => {
      const s = start.current
      start.current = null
      if (!s || s.skip || !s.claimed) return
      // settle to whichever end the row is closer to
      const shouldOpen = xRef.current < -actionWidth / 2
      openRef.current = shouldOpen
      set(shouldOpen ? -actionWidth : 0)
    },
    onTouchCancel: () => {
      start.current = null
      close()
    }
  }

  const style: React.CSSProperties = {
    transform: `translateX(${x}px)`,
    transition: start.current?.claimed ? 'none' : 'transform 240ms cubic-bezier(0.23, 1, 0.32, 1)'
  }

  return { handlers, style, open: x < -4, close, actionWidth }
}
