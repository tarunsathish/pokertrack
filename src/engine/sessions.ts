// Session-level money and time math. Pure functions over a session shape so
// they can be tested without touching Dexie — the same reason the hand engine
// lives here. All money stays integer cents; time is epoch milliseconds.
import type { Cents } from './money'

/** A paused stretch — stepped away from the table. `end` null means still on break. */
export interface SessionBreak {
  start: number
  end: number | null
}

/** A stack count the user punched in mid-session, with when they did it. */
export interface StackMark {
  amount: Cents
  ts: number
}

/**
 * The session fields this math needs. The stored `Session` in db.ts satisfies
 * this; keeping it structural means tests can pass literals.
 */
export interface SessionLike {
  startedAt: number
  endedAt: number | null
  buyIn: Cents
  rebuys?: { ts: number; amount: Cents }[]
  cashOut: Cents | null
  breaks?: SessionBreak[]
  stack?: StackMark | null
  bb: Cents
}

/** Total money put in: initial buy-in plus every rebuy. */
export function invested(s: SessionLike): Cents {
  return s.buyIn + (s.rebuys ?? []).reduce((sum, r) => sum + r.amount, 0)
}

/** Milliseconds spent away from the table. An open break runs up to `now`. */
export function breakMs(s: SessionLike, now: number): number {
  return (s.breaks ?? []).reduce((sum, b) => {
    const end = b.end ?? (s.endedAt ?? now)
    return sum + Math.max(0, end - b.start)
  }, 0)
}

/** True if the user is currently stepped away. */
export function onBreak(s: SessionLike): boolean {
  return (s.breaks ?? []).some((b) => b.end === null)
}

/**
 * Real time at the table: wall clock from sit-down to cash-out (or `now` while
 * live), minus breaks. Never negative — a hand-edited end time that lands
 * before the start time clamps to zero rather than poisoning hourly rates.
 */
export function tableMs(s: SessionLike, now: number): number {
  const end = s.endedAt ?? now
  return Math.max(0, end - s.startedAt - breakMs(s, now))
}

/** Final result, known only once cashed out. Null while the session is live. */
export function netFinal(s: SessionLike): Cents | null {
  return s.cashOut === null ? null : s.cashOut - invested(s)
}

/**
 * Live result from the last stack count the user entered. Null when they
 * haven't entered one — the stack mark is always optional, so every caller
 * has to handle its absence rather than showing a fake zero.
 */
export function netLive(s: SessionLike): Cents | null {
  return s.stack ? s.stack.amount - invested(s) : null
}

/** Best result available: the cash-out if there is one, else the live stack. */
export function netBest(s: SessionLike): Cents | null {
  return netFinal(s) ?? netLive(s)
}

/** Cents per hour, rounded to the cent. Null when there's no measurable time. */
export function hourly(net: Cents, ms: number): Cents | null {
  if (ms <= 0) return null
  return Math.round(net / (ms / 3600000))
}

/** Big blinds per hour. Null when the stake or the duration is unusable. */
export function bbPerHour(net: Cents, bb: Cents, ms: number): number | null {
  if (ms <= 0 || bb <= 0) return null
  return net / bb / (ms / 3600000)
}

/** "2h 15m" / "45m" / "0m" — compact enough for a stat slot. */
export function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** "just now" / "20m ago" / "2h ago" — used to mark a stack count as stale. */
export function fmtAgo(ts: number, now: number): string {
  const mins = Math.floor(Math.max(0, now - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  return `${h}h ago`
}

/** A stack count older than this is shown with its age so it isn't mistaken for current. */
export const STACK_STALE_MS = 10 * 60 * 1000

/**
 * Aggregate over finished sessions. Sessions still live, or ended without a
 * cash-out, are excluded — they have no result to count, and including them
 * would silently drag the hourly rate toward zero.
 */
export interface Totals {
  sessions: number
  net: Cents
  ms: number
  hourly: Cents | null
  bbPerHour: number | null
  won: number
  wonPct: number | null
  best: Cents | null
  worst: Cents | null
}

export function totals(sessions: SessionLike[], now: number): Totals {
  const done = sessions.filter((s) => s.endedAt !== null && s.cashOut !== null)
  const nets = done.map((s) => netFinal(s)!)
  const net = nets.reduce((a, b) => a + b, 0)
  const ms = done.reduce((sum, s) => sum + tableMs(s, now), 0)
  // bb/hr is averaged per session because each session can be a different
  // stake — summing cents and dividing by one bb would be meaningless.
  const bbSum = done.reduce((sum, s) => sum + (s.bb > 0 ? netFinal(s)! / s.bb : 0), 0)
  const won = nets.filter((n) => n > 0).length
  return {
    sessions: done.length,
    net,
    ms,
    hourly: hourly(net, ms),
    bbPerHour: ms > 0 ? bbSum / (ms / 3600000) : null,
    won,
    wonPct: done.length > 0 ? Math.round((100 * won) / done.length) : null,
    best: nets.length ? Math.max(...nets) : null,
    worst: nets.length ? Math.min(...nets) : null
  }
}

/**
 * Cumulative net after each finished session, oldest first — the bankroll
 * curve. Returns one point per session plus a leading zero so the line starts
 * at the origin instead of at the first result.
 */
export function bankrollCurve(
  sessions: SessionLike[]
): { ts: number; cum: Cents; net: Cents }[] {
  const done = sessions
    .filter((s) => s.endedAt !== null && s.cashOut !== null)
    .sort((a, b) => a.startedAt - b.startedAt)
  let cum = 0
  return done.map((s) => {
    const net = netFinal(s)!
    cum += net
    return { ts: s.endedAt!, cum, net }
  })
}
