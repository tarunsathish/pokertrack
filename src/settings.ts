import type { Cents } from './engine/money'

export interface Stakes {
  sb: Cents
  bb: Cents
  ante: Cents
}

export type ThemeId = 'felt' | 'midnight' | 'noir'

export interface AppSettings {
  recentStakes: Stakes[] // most recent first, deduped — the learned quick-picks
  lastTableSize: number
  lastVenue: string
  lastBuyIn: Cents
  displayBB: boolean // show amounts in bb instead of $
  hideHoleCards: boolean // blur your own cards until tapped — for use at the table
  tagPresets: string[]
  theme: ThemeId
}

export const THEMES: { id: ThemeId; name: string; swatch: string; blurb: string }[] = [
  { id: 'felt', name: 'Card room', swatch: '#1d3527', blurb: 'Classic green felt' },
  { id: 'midnight', name: 'Midnight', swatch: '#1a2740', blurb: 'High-stakes navy' },
  { id: 'noir', name: 'Noir', swatch: '#24221d', blurb: 'After-hours black' }
]

const THEME_CANVAS: Record<ThemeId, string> = {
  felt: '#0a140e',
  midnight: '#090e18',
  noir: '#0d0c0a'
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
  // keep the iOS status-bar / chrome region in the same felt as the app
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_CANVAS[theme])
}

const KEY = 'pokertrack-settings'

export const DEFAULT_TAGS = ['unsure', 'bluff', 'bluff-catch', 'missed value', 'bad call', 'cooler', 'tilt', 'big pot']

const defaults: AppSettings = {
  recentStakes: [
    { sb: 5, bb: 10, ante: 0 },
    { sb: 10, bb: 20, ante: 0 },
    { sb: 25, bb: 50, ante: 0 }
  ],
  lastTableSize: 6,
  lastVenue: '',
  lastBuyIn: 2000,
  displayBB: false,
  hideHoleCards: false,
  tagPresets: DEFAULT_TAGS,
  theme: 'felt'
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function rememberStakes(s: AppSettings, stakes: Stakes): AppSettings {
  const rest = s.recentStakes.filter(
    (x) => !(x.sb === stakes.sb && x.bb === stakes.bb && x.ante === stakes.ante)
  )
  return { ...s, recentStakes: [stakes, ...rest].slice(0, 6) }
}
