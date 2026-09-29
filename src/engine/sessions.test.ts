import { describe, it, expect } from 'vitest'
import {
  invested,
  breakMs,
  onBreak,
  tableMs,
  netFinal,
  netLive,
  netBest,
  hourly,
  bbPerHour,
  fmtDuration,
  fmtAgo,
  totals,
  bankrollCurve,
  type SessionLike
} from './sessions'

const H = 3600000
const T0 = 1_700_000_000_000

const sess = (over: Partial<SessionLike> = {}): SessionLike => ({
  startedAt: T0,
  endedAt: T0 + 3 * H,
  buyIn: 20000, // $200
  rebuys: [],
  cashOut: 26000, // $260 → +$60
  breaks: [],
  stack: null,
  bb: 200, // $2 BB
  ...over
})

describe('session money', () => {
  it('sums buy-in and rebuys', () => {
    expect(invested(sess())).toBe(20000)
    expect(
      invested(sess({ rebuys: [{ ts: T0, amount: 10000 }, { ts: T0, amount: 5000 }] }))
    ).toBe(35000)
  })

  it('computes final net only once cashed out', () => {
    expect(netFinal(sess())).toBe(6000)
    expect(netFinal(sess({ cashOut: null }))).toBeNull()
  })

  it('accounts for rebuys in the net', () => {
    // in for $200 + $100, left with $260 → down $40
    const s = sess({ rebuys: [{ ts: T0, amount: 10000 }], cashOut: 26000 })
    expect(netFinal(s)).toBe(-4000)
  })

  it('returns live net from a stack mark, null without one', () => {
    expect(netLive(sess({ cashOut: null, stack: { amount: 23000, ts: T0 } }))).toBe(3000)
    expect(netLive(sess({ cashOut: null }))).toBeNull()
  })

  it('prefers the cash-out over a stale stack mark', () => {
    const s = sess({ cashOut: 26000, stack: { amount: 99900, ts: T0 } })
    expect(netBest(s)).toBe(6000)
  })

  it('falls back to the stack mark while live', () => {
    const s = sess({ endedAt: null, cashOut: null, stack: { amount: 18000, ts: T0 } })
    expect(netBest(s)).toBe(-2000)
  })
})

describe('session time', () => {
  it('measures table time from wall clock when there are no breaks', () => {
    expect(tableMs(sess(), T0 + 3 * H)).toBe(3 * H)
  })

  it('subtracts closed breaks', () => {
    const s = sess({ breaks: [{ start: T0 + H, end: T0 + H + 1800000 }] }) // 30m
    expect(tableMs(s, T0 + 3 * H)).toBe(3 * H - 1800000)
  })

  it('runs an open break up to now while live', () => {
    const s = sess({ endedAt: null, cashOut: null, breaks: [{ start: T0 + H, end: null }] })
    expect(breakMs(s, T0 + 2 * H)).toBe(H)
    expect(tableMs(s, T0 + 2 * H)).toBe(H)
    expect(onBreak(s)).toBe(true)
  })

  it('closes an open break at the end time once cashed out', () => {
    // User ended the session without coming back from break: the break stops
    // at cash-out, not at whatever "now" happens to be days later.
    const s = sess({ breaks: [{ start: T0 + 2 * H, end: null }] })
    expect(breakMs(s, T0 + 500 * H)).toBe(H)
    expect(tableMs(s, T0 + 500 * H)).toBe(2 * H)
  })

  it('never returns negative time when the end precedes the start', () => {
    expect(tableMs(sess({ endedAt: T0 - H }), T0)).toBe(0)
  })

  it('clamps breaks longer than the session itself', () => {
    const s = sess({ breaks: [{ start: T0, end: T0 + 99 * H }] })
    expect(tableMs(s, T0 + 3 * H)).toBe(0)
  })
})

describe('rates', () => {
  it('computes cents per hour', () => {
    expect(hourly(6000, 3 * H)).toBe(2000) // +$60 over 3h = $20/hr
    expect(hourly(-4500, 90 * 60000)).toBe(-3000) // -$45 over 1.5h
  })

  it('refuses a rate without measurable time', () => {
    expect(hourly(6000, 0)).toBeNull()
    expect(bbPerHour(6000, 200, 0)).toBeNull()
  })

  it('refuses bb/hr when the stake is unusable', () => {
    expect(bbPerHour(6000, 0, 3 * H)).toBeNull()
  })

  it('computes bb per hour', () => {
    // +$60 at $2bb = 30bb over 3h = 10bb/hr
    expect(bbPerHour(6000, 200, 3 * H)).toBeCloseTo(10)
  })
})

describe('formatting', () => {
  it('formats durations compactly', () => {
    expect(fmtDuration(0)).toBe('0m')
    expect(fmtDuration(45 * 60000)).toBe('45m')
    expect(fmtDuration(2 * H)).toBe('2h')
    expect(fmtDuration(2 * H + 15 * 60000)).toBe('2h 15m')
    expect(fmtDuration(-500)).toBe('0m')
  })

  it('formats staleness', () => {
    expect(fmtAgo(T0, T0 + 30000)).toBe('just now')
    expect(fmtAgo(T0, T0 + 20 * 60000)).toBe('20m ago')
    expect(fmtAgo(T0, T0 + 3 * H)).toBe('3h ago')
  })
})

describe('totals', () => {
  const finished = [
    sess({ startedAt: T0, endedAt: T0 + 2 * H, buyIn: 20000, cashOut: 26000, bb: 200 }), // +$60 / 2h
    sess({ startedAt: T0 + 10 * H, endedAt: T0 + 13 * H, buyIn: 20000, cashOut: 14000, bb: 200 }) // -$60 / 3h
  ]

  it('aggregates net, time and win rate', () => {
    const t = totals(finished, T0 + 20 * H)
    expect(t.sessions).toBe(2)
    expect(t.net).toBe(0)
    expect(t.ms).toBe(5 * H)
    expect(t.hourly).toBe(0)
    expect(t.won).toBe(1)
    expect(t.wonPct).toBe(50)
    expect(t.best).toBe(6000)
    expect(t.worst).toBe(-6000)
  })

  it('excludes live and abandoned sessions from the scoreboard', () => {
    const withLive = [
      ...finished,
      sess({ endedAt: null, cashOut: null, stack: { amount: 50000, ts: T0 } }),
      sess({ endedAt: T0 + H, cashOut: null }) // ended without cashing out
    ]
    const t = totals(withLive, T0 + 20 * H)
    expect(t.sessions).toBe(2)
    expect(t.net).toBe(0)
  })

  it('reports empty totals with no finished sessions', () => {
    const t = totals([], T0)
    expect(t.sessions).toBe(0)
    expect(t.hourly).toBeNull()
    expect(t.wonPct).toBeNull()
    expect(t.best).toBeNull()
  })

  it('averages bb/hr across different stakes rather than summing cents', () => {
    // +$60 at $2bb (30bb) over 1h, then +$60 at $10bb (6bb) over 1h → 18bb/hr
    const mixed = [
      sess({ startedAt: T0, endedAt: T0 + H, buyIn: 20000, cashOut: 26000, bb: 200 }),
      sess({ startedAt: T0 + 5 * H, endedAt: T0 + 6 * H, buyIn: 20000, cashOut: 26000, bb: 1000 })
    ]
    expect(totals(mixed, T0 + 9 * H).bbPerHour).toBeCloseTo(18)
  })
})

describe('bankroll curve', () => {
  it('accumulates net oldest first', () => {
    const c = bankrollCurve([
      sess({ startedAt: T0 + 10 * H, endedAt: T0 + 11 * H, cashOut: 14000 }), // -$60
      sess({ startedAt: T0, endedAt: T0 + H, cashOut: 26000 }) // +$60
    ])
    expect(c.map((p) => p.cum)).toEqual([6000, 0])
    expect(c.map((p) => p.net)).toEqual([6000, -6000])
  })

  it('skips sessions with no result', () => {
    expect(bankrollCurve([sess({ endedAt: null, cashOut: null })])).toEqual([])
  })
})
