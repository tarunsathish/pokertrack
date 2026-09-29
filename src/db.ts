import Dexie, { type Table } from 'dexie'
import type { HandEvent, HandSetup } from './engine/hand'
import type { Cents } from './engine/money'

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
}

/** Total money put into a session: initial buy-in plus all rebuys. */
export function sessionInvested(s: Session): Cents {
  return s.buyIn + (s.rebuys ?? []).reduce((sum, r) => sum + r.amount, 0)
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
  }
}

export const db = new PokerTrackDB()

export async function activeSession(): Promise<Session | undefined> {
  return db.sessions.filter((s) => s.endedAt === null).last()
}

export async function exportAll(): Promise<string> {
  const [sessions, hands] = await Promise.all([db.sessions.toArray(), db.hands.toArray()])
  return JSON.stringify({ app: 'pokertrack', version: 1, exportedAt: new Date().toISOString(), sessions, hands }, null, 2)
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
