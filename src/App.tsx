import React, { useEffect, useRef, useState } from 'react'
import { PlayTab } from './components/PlayTab'
import { HandsTab } from './components/HandsTab'
import { SessionsTab } from './components/SessionsTab'
import { StatsTab } from './components/StatsTab'
import { SettingsTab } from './components/SettingsTab'
import { SpadeIcon, CardsIcon, ChipStackIcon, ChartIcon, SlidersIcon } from './components/Icons'

type Tab = 'play' | 'hands' | 'sessions' | 'stats' | 'settings'

// Five top-level sections is the platform ceiling for a tab bar; sections only,
// never actions. Order runs live work → records → analysis → config.
const TABS: { id: Tab; label: string; ico: React.ComponentType }[] = [
  { id: 'play', label: 'Play', ico: SpadeIcon },
  { id: 'hands', label: 'Hands', ico: CardsIcon },
  { id: 'sessions', label: 'Sessions', ico: ChipStackIcon },
  { id: 'stats', label: 'Stats', ico: ChartIcon },
  { id: 'settings', label: 'Settings', ico: SlidersIcon }
]

const TAB_ORDER: Tab[] = TABS.map((t) => t.id)

export default function App() {
  const [tab, setTab] = useState<Tab>('play')
  const [slide, setSlide] = useState<'left' | 'right' | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [handsSeed, setHandsSeed] = useState<'review' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const touchStart = useRef<{ x: number; y: number; skip: boolean } | null>(null)
  const barRef = useRef<HTMLElement>(null)

  // swipe left/right anywhere on a main screen to change tabs
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    const el = e.target as Element
    touchStart.current = {
      x: t.clientX,
      y: t.clientY,
      // don't hijack horizontal scrollers, text fields, or full-screen flows
      skip: !!el.closest('.actor-row, input, textarea, .overlay, .tabbar')
    }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current
    touchStart.current = null
    if (!s || s.skip) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return
    const i = TAB_ORDER.indexOf(tab)
    const next = TAB_ORDER[i + (dx < 0 ? 1 : -1)]
    if (next) {
      setSlide(dx < 0 ? 'left' : 'right')
      setTab(next)
    }
  }

  // hold the tab bar and drag — the lens scrubs with your finger
  const idxFromX = (clientX: number) => {
    const bar = barRef.current
    if (!bar) return null
    const r = bar.getBoundingClientRect()
    const rel = (clientX - r.left - 6) / (r.width - 12)
    return Math.min(TAB_ORDER.length - 1, Math.max(0, Math.floor(rel * TAB_ORDER.length)))
  }
  const dragRef = useRef<number | null>(null)
  const onBarTouchMove = (e: React.TouchEvent) => {
    const i = idxFromX(e.touches[0].clientX)
    if (i !== null) {
      dragRef.current = i
      setDragIdx(i)
    }
  }
  const onBarTouchEnd = () => {
    const i = dragRef.current
    dragRef.current = null
    if (i !== null) {
      const next = TAB_ORDER[i]
      if (next !== tab) {
        setSlide(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 'left' : 'right')
        setTab(next)
      }
      setDragIdx(null)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

  // Keep the screen awake while the app is open during a session.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        /* not critical */
      }
    }
    acquire()
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [])

  return (
    <div className="app">
      <div
        key={tab}
        className={`tab-view${slide ? ` slide-${slide}` : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {tab === 'play' && <PlayTab onToast={showToast} />}
        {tab === 'hands' && <HandsTab seed={handsSeed} onSeedConsumed={() => setHandsSeed(null)} />}
        {tab === 'sessions' && <SessionsTab onToast={showToast} />}
        {tab === 'stats' && (
          <StatsTab
            onReview={() => {
              setHandsSeed('review')
              setTab('hands')
            }}
          />
        )}
        {tab === 'settings' && <SettingsTab onToast={showToast} />}
      </div>

      <nav
        className="tabbar"
        style={{ ['--tab-count' as string]: TABS.length }}
        ref={barRef}
        onTouchMove={onBarTouchMove}
        onTouchEnd={onBarTouchEnd}
        onTouchCancel={() => {
          dragRef.current = null
          setDragIdx(null)
        }}
      >
        <span
          className={`tab-lens${dragIdx !== null ? ' dragging' : ''}`}
          style={{
            transform: `translateX(${(dragIdx ?? TABS.findIndex((t) => t.id === tab)) * 100}%)`
          }}
        />
        {TABS.map((t, i) => (
          <button
            key={t.id}
            className={tab === t.id || dragIdx === i ? 'active' : ''}
            aria-label={t.label}
            onClick={() => setTab(t.id)}
          >
            <t.ico />
          </button>
        ))}
      </nav>

      {toast && <div className="toast num">{toast}</div>}
    </div>
  )
}
