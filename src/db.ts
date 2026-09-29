import Dexie, { type Table } from 'dexie'
import type { HandEvent, HandSetup } from './engine/hand'
import type { Cents } from './engine/money'
import { invested, netFinal, tableMs, type SessionBreak, type StackMark } from './engine/sessions'
import { toCsv, dollars } from './engine/csv'

export interface Session {
  id?: number
  startedAt: number
  endedAt: number | null
  sb: Cents
  bb: Cents
  ante: Cents
  tableSize: number
  venue: string
  buyIn: Cents
  rebuys?: { ts: number; amount: Cents }[]
  cashOut: Cents | null
  /** Stretches away from the table, so duration reflects real playing time. */
  breaks?: SessionBreak[]
  /** Last stack count entered mid-session. Optional — drives live P/L when present. */
  stack?: StackMark | null
  /** Written at or after the table: how the session went, stop-loss calls, reads. */
  note?: string
}

/**
 * Total money put into a session: initial buy-in plus all rebuys.
 * Re-exported from the engine so existing callers keep working.
 */
export function sessionInvested(s: Session): Cents {
  return invested(s)
}

export interface HandRecord {
  id?: number
  sessionId: number
  ts: number
  setup: HandSetup
  events: HandEvent[]
  heroCards: string[]
  heroPos: string
  board: string[]
  result: Cents // hero net for the hand
  potTotal: Cents
  sb: Cents
  bb: Cents
  tags: string[]
  note: string // written at the table — what you were thinking
  reviewNote: string // written later — what you should have done
  flagged: boolean // "review later"
  reviewed: boolean
}

class PokerTrackDB extends Dexie {
  sessions!: Table<Session, number>
  hands!: Table<HandRecord, number>

  constructor() {
    super('pokertrack')
    this.version(1).stores({
      sessions: '++id, startedAt, endedAt',
      hands: '++id, sessionId, ts, heroPos, flagged, reviewed, *tags'
    })
    // v2 indexes venue so the Stats tab can slice by room without a full scan.
    // The new Session fields (breaks/stack/note) are all optional, so existing
    // rows need no rewrite — Dexie carries them forward untouched.
    this.version(2).stores({
      sessions: '++id, startedAt, endedAt, venue',
      hands: '++id, sessionId, ts, heroPos, flagged, reviewed, *tags'
    })
  }
}

export const db = new PokerTrackDB()

export async function activeSession(): Promise<Session | undefined> {
  return db.sessions.filter((s) => s.endedAt === null).last()
}

export async function exportAll(): Promise<string> {
  const [sessions, hands] = await Promise.all([db.sessions.toArray(), db.hands.toArray()])
  return JSON.stringify({ app: 'pokertrack', version: 2, exportedAt: new Date().toISOString(), sessions, hands }, null, 2)
}

export async function importAll(json: string): Promise<{ sessions: number; hands: number }> {
  const data = JSON.parse(json)
  if (data.app !== 'pokertrack' || !Array.isArray(data.sessions) || !Array.isArray(data.hands)) {
    throw new Error('Not a PokerTrack backup file')
  }
  await db.transaction('rw', db.sessions, db.hands, async () => {
    await db.sessions.clear()
    await db.hands.clear()
    await db.sessions.bulkAdd(data.sessions)
    await db.hands.bulkAdd(data.hands)
  })
  return { sessions: data.sessions.length, hands: data.hands.length }
}

// ---------- spreadsheet export ----------

const iso = (ts: number) => new Date(ts).toISOString()

/** One row per session, with the derived figures a spreadsheet can't recompute. */
export async function exportSessionsCsv(): Promise<string> {
  const sessions = await db.sessions.orderBy('startedAt').toArray()
  const hands = await db.hands.toArray()
  const handCount = new Map<number, number>()
  for (const h of hands) handCount.set(h.sessionId, (handCount.get(h.sessionId) ?? 0) + 1)

  const now = Date.now()
  const rows = sessions.map((s) => {
    const net = netFinal(s)
    const ms = tableMs(s, now)
    const hours = ms / 3600000
    return [
      s.id ?? '',
      iso(s.startedAt),
      s.endedAt ? iso(s.endedAt) : '',
      hours.toFixed(2),
      s.venue,
      dollars(s.sb),
      dollars(s.bb),
      s.tableSize,
      dollars(invested(s)),
      s.cashOut === null ? '' : dollars(s.cashOut),
      net === null ? '' : dollars(net),
      net === null || hours <= 0 ? '' : dollars(Math.round(net / hours)),
      net === null || hours <= 0 || s.bb <= 0 ? '' : (net / s.bb / hours).toFixed(2),
      (s.rebuys ?? []).length,
      (s.breaks ?? []).length,
      handCount.get(s.id!) ?? 0,
      s.note ?? ''
    ]
  })

  return toCsv(
    [
      'session_id', 'started_at', 'ended_at', 'hours', 'venue', 'sb', 'bb', 'table_size',
      'invested', 'cashed_out', 'net', 'per_hour', 'bb_per_hour', 'rebuys', 'breaks',
      'hands_logged', 'note'
    ],
    rows
  )
}

/** One row per logged hand. */
export async function exportHandsCsv(): Promise<string> {
  const [hands, sessions] = await Promise.all([db.hands.orderBy('ts').toArray(), db.sessions.toArray()])
  const byId = new Map(sessions.map((s) => [s.id!, s]))

  const rows = hands.map((h) => [
    h.id ?? '',
    h.sessionId,
    iso(h.ts),
    byId.get(h.sessionId)?.venue ?? '',
    dollars(h.sb),
    dollars(h.bb),
    h.setup.tableSize,
    h.heroPos,
    h.heroCards.join(' '),
    h.board.join(' '),
    dollars(h.potTotal),
    dollars(h.result),
    h.bb > 0 ? (h.result / h.bb).toFixed(1) : '',
    h.tags.join('; '),
    h.flagged ? 'yes' : '',
    h.reviewed ? 'yes' : '',
    h.note,
    h.reviewNote
  ])

  return toCsv(
    [
      'hand_id', 'session_id', 'played_at', 'venue', 'sb', 'bb', 'table_size', 'position',
      'hole_cards', 'board', 'pot', 'net', 'net_bb', 'tags', 'flagged', 'reviewed',
      'note', 'review_note'
    ],
    rows
  )
}
