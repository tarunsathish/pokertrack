import { describe, it, expect } from 'vitest'
import { parseCents, fmt, fmtBB } from './money'
import { positionsFor, preflopOrder, postflopOrder, nextPosition } from './positions'
import { computePots, distributePots } from './pots'
import { replayHand, heroResult, needsShowdown, isAllInRunout, type HandSetup, type HandEvent } from './hand'

const microSetup = (over: Partial<HandSetup> = {}): HandSetup => ({
  tableSize: 6,
  heroPos: 'BTN',
  sb: 10, // $0.10
  bb: 20, // $0.20
  ante: 0,
  straddles: [],
  heroStack: 2000,
  ...over
})

describe('money', () => {
  it('parses user text to cents', () => {
    expect(parseCents('0.10')).toBe(10)
    expect(parseCents('.05')).toBe(5)
    expect(parseCents('2')).toBe(200)
    expect(parseCents('2.5')).toBe(250)
    expect(parseCents('$1,000.25')).toBe(100025)
    expect(parseCents('abc')).toBeNull()
    expect(parseCents('1.234')).toBeNull()
    expect(parseCents('')).toBeNull()
  })
  it('formats cents', () => {
    expect(fmt(10)).toBe('$0.10')
    expect(fmt(200)).toBe('$2')
    expect(fmt(250)).toBe('$2.50')
    expect(fmt(-55)).toBe('-$0.55')
  })
  it('formats big blinds', () => {
    expect(fmtBB(250, 20)).toBe('12.5bb')
    expect(fmtBB(60, 20)).toBe('3bb')
  })
})

describe('positions', () => {
  it('supports 2-10 handed', () => {
    for (let n = 2; n <= 10; n++) expect(positionsFor(n)).toHaveLength(n)
  })
  it('preflop order: UTG first, BB last (6-max)', () => {
    expect(preflopOrder(6)).toEqual(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'])
  })
  it('preflop order with UTG straddle: HJ first, straddler last', () => {
    expect(preflopOrder(6, 1)).toEqual(['HJ', 'CO', 'BTN', 'SB', 'BB', 'UTG'])
  })
  it('heads-up: SB(button) first preflop, BB first postflop', () => {
    expect(preflopOrder(2)).toEqual(['SB', 'BB'])
    expect(postflopOrder(2)).toEqual(['BB', 'SB'])
  })
  it('position rotates backward through seating order', () => {
    expect(nextPosition('UTG', 6)).toBe('BB')
    expect(nextPosition('BB', 6)).toBe('SB')
    expect(nextPosition('SB', 6)).toBe('BTN')
    expect(nextPosition('BTN', 6)).toBe('CO')
  })
})

describe('pot math', () => {
  it('simple pot, uncalled bet returned', () => {
    // BTN bets 100 total, everyone folds after putting in blinds 10+20.
    const { pots, refunds } = computePots([
      { pos: 'SB', total: 10, folded: true },
      { pos: 'BB', total: 20, folded: true },
      { pos: 'BTN', total: 100, folded: false }
    ])
    // BTN's bet above the highest folded contribution (20) is returned.
    expect(refunds.BTN).toBe(80)
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(10 + 20 + 20)
    const won = distributePots(pots, ['BTN'], refunds)
    expect(won.BTN).toBe(80 + 50)
  })

  it('side pots with two all-ins', () => {
    // A all-in 50, B all-in 200, C calls 200.
    const { pots, refunds } = computePots([
      { pos: 'A', total: 50, folded: false },
      { pos: 'B', total: 200, folded: false },
      { pos: 'C', total: 200, folded: false }
    ])
    expect(refunds).toEqual({})
    expect(pots).toHaveLength(2)
    expect(pots[0]).toEqual({ amount: 150, eligible: ['A', 'B', 'C'] })
    expect(pots[1]).toEqual({ amount: 300, eligible: ['B', 'C'] })
    // Short stack A wins overall: A takes main pot; side pot goes to B/C.
    const won = distributePots(pots, ['A'], refunds)
    expect(won.A).toBe(150)
    expect(won.B).toBe(150)
    expect(won.C).toBe(150)
  })

  it('split pot with odd cent', () => {
    const { pots, refunds } = computePots([
      { pos: 'A', total: 45, folded: false },
      { pos: 'B', total: 45, folded: false },
      { pos: 'C', total: 15, folded: true }
    ])
    const won = distributePots(pots, ['A', 'B'], refunds)
    expect(won.A + won.B).toBe(105)
    expect(Math.abs(won.A - won.B)).toBe(1)
  })
})

describe('hand replay', () => {
  it('open, fold-around: blinds inferred folded, opener wins', () => {
    const setup = microSetup()
    const events: HandEvent[] = [
      { type: 'action', pos: 'BTN', verb: 'raise', to: 50 }, // UTG,HJ,CO auto-fold
      { type: 'passive-rest' } // SB, BB fold
    ]
    const state = replayHand(setup, events)
    expect(state.error).toBeNull()
    expect(state.handOver).toBe(true)
    expect(state.winners).toEqual(['BTN'])
    // BTN wins SB+BB (30), gets uncalled 30 back; net +30.
    expect(heroResult(state, 'BTN')).toBe(30)
  })

  it('limped pot, BB checks option, check-down to showdown', () => {
    const setup = microSetup({ heroPos: 'BB' })
    const events: HandEvent[] = [
      { type: 'action', pos: 'CO', verb: 'call' }, // UTG,HJ auto-fold
      { type: 'passive-rest' } // BTN folds? No: BTN,SB owe money → fold; BB checks option
    ]
    let state = replayHand(setup, events)
    expect(state.error).toBeNull()
    expect(state.bettingClosed).toBe(true)
    expect(state.street).toBe('preflop')
    expect(state.potTotal).toBe(20 + 10 + 20) // CO call + dead SB + BB

    const more: HandEvent[] = [
      ...events,
      { type: 'board', cards: ['Ah', '7d', '2c'] },
      { type: 'passive-rest' }, // check check
      { type: 'board', cards: ['Kd'] },
      { type: 'passive-rest' },
      { type: 'board', cards: ['2h'] },
      { type: 'passive-rest' }
    ]
    state = replayHand(setup, more)
    expect(state.error).toBeNull()
    expect(needsShowdown(state)).toBe(true)
    state = replayHand(setup, [...more, { type: 'showdown', winners: ['BB'] }])
    expect(heroResult(state, 'BB')).toBe(30) // wins CO's 20 + SB's 10
  })

  it('raise, call, bet/call down to showdown with correct pot', () => {
    const setup = microSetup({ heroPos: 'CO' })
    const events: HandEvent[] = [
      { type: 'action', pos: 'CO', verb: 'raise', to: 60 },
      { type: 'action', pos: 'BB', verb: 'call' }, // BTN, SB auto-fold
      { type: 'board', cards: ['Qs', 'Jh', '3d'] },
      { type: 'action', pos: 'CO', verb: 'bet', to: 80 }, // BB auto-checks first
      { type: 'action', pos: 'BB', verb: 'call' },
      { type: 'board', cards: ['9c'] },
      { type: 'passive-rest' },
      { type: 'board', cards: ['4h'] },
      { type: 'passive-rest' },
      { type: 'showdown', winners: ['CO'], shown: { BB: ['Qh', 'Td'] } }
    ]
    const state = replayHand(setup, events)
    expect(state.error).toBeNull()
    // Pot: 60+60 preflop (BB completes) + SB 10 dead + 80+80 flop = 290.
    expect(state.potTotal).toBe(290)
    expect(heroResult(state, 'CO')).toBe(290 - 140) // wins pot minus own 140 in
    expect(state.shown.BB).toEqual(['Qh', 'Td'])
  })

  it('BB cannot be skipped by passive fill when owed nothing', () => {
    const setup = microSetup()
    // CO raises; BB should NOT be auto-folded silently when hero acts... BB owes money so folds on passive-rest — correct.
    // But in a limped pot BB checks rather than folds:
    const state = replayHand(setup, [
      { type: 'action', pos: 'CO', verb: 'call' },
      { type: 'passive-rest' }
    ])
    const bb = state.players.find((p) => p.pos === 'BB')!
    expect(bb.folded).toBe(false) // checked their option
    expect(state.bettingClosed).toBe(true)
  })

  it('straddled pot: action starts after straddle, straddler gets last option', () => {
    const setup = microSetup({ straddles: [40], heroPos: 'UTG' })
    const state = replayHand(setup, [{ type: 'action', pos: 'BTN', verb: 'call' }])
    expect(state.error).toBeNull()
    // HJ, CO auto-folded; next due: SB
    expect(state.toAct).toBe('SB')
    const s2 = replayHand(setup, [
      { type: 'action', pos: 'BTN', verb: 'call' },
      { type: 'passive-rest' } // SB folds, BB folds, straddler (UTG) checks option
    ])
    expect(s2.error).toBeNull()
    const utg = s2.players.find((p) => p.pos === 'UTG')!
    expect(utg.folded).toBe(false)
    expect(s2.bettingClosed).toBe(true)
    expect(s2.potTotal).toBe(40 + 40 + 10 + 20) // straddle + BTN call + blinds
  })

  it('all-in and call: runout streets then showdown, side money right', () => {
    const setup = microSetup({ heroPos: 'BTN' })
    const events: HandEvent[] = [
      { type: 'action', pos: 'BTN', verb: 'raise', to: 60 },
      { type: 'action', pos: 'BB', verb: 'allin', to: 500 },
      { type: 'action', pos: 'BTN', verb: 'call' }
    ]
    let state = replayHand(setup, events)
    expect(state.error).toBeNull()
    expect(isAllInRunout(state)).toBe(true)
    const runout: HandEvent[] = [
      ...events,
      { type: 'board', cards: ['As', 'Kd', '7h'] },
      { type: 'board', cards: ['2d'] },
      { type: 'board', cards: ['9s'] }
    ]
    state = replayHand(setup, runout)
    expect(needsShowdown(state)).toBe(true)
    state = replayHand(setup, [...runout, { type: 'showdown', winners: ['BTN'] }])
    expect(state.error).toBeNull()
    expect(heroResult(state, 'BTN')).toBe(510) // BB's 500 + SB's dead 10
    expect(heroResult(state, 'BB')).toBe(-500)
  })

  it('all-in under-call gets excess returned', () => {
    const setup = microSetup({ heroPos: 'CO' })
    const events: HandEvent[] = [
      { type: 'action', pos: 'CO', verb: 'raise', to: 300 },
      { type: 'action', pos: 'BTN', verb: 'allin', to: 150 },
      { type: 'passive-rest' }, // blinds fold; CO owes nothing more (150 < 300)
      { type: 'board', cards: ['5c', '6d', 'Th'] },
      { type: 'board', cards: ['Jd'] },
      { type: 'board', cards: ['3s'] },
      { type: 'showdown', winners: ['BTN'] }
    ]
    const state = replayHand(setup, events)
    expect(state.error).toBeNull()
    // CO's uncalled 150 returned; BTN wins 150+150+30 blinds = 330 → net +180.
    expect(heroResult(state, 'BTN')).toBe(180)
    expect(heroResult(state, 'CO')).toBe(-150)
  })

  it('chopped pot splits evenly', () => {
    const setup = microSetup({ heroPos: 'SB' })
    const events: HandEvent[] = [
      { type: 'action', pos: 'SB', verb: 'call' }, // everyone else auto-folds... SB completes
      { type: 'action', pos: 'BB', verb: 'check' },
      { type: 'board', cards: ['Ah', 'Kh', 'Qh'] },
      { type: 'passive-rest' },
      { type: 'board', cards: ['Jh'] },
      { type: 'passive-rest' },
      { type: 'board', cards: ['Th'] },
      { type: 'passive-rest' },
      { type: 'showdown', winners: ['SB', 'BB'] }
    ]
    const state = replayHand(setup, events)
    expect(state.error).toBeNull()
    expect(heroResult(state, 'SB')).toBe(0)
    expect(heroResult(state, 'BB')).toBe(0)
  })

  it('equal blinds (10c/10c) work', () => {
    const setup = microSetup({ sb: 10, bb: 10, heroPos: 'BTN' })
    const state = replayHand(setup, [
      { type: 'action', pos: 'BTN', verb: 'raise', to: 30 },
      { type: 'passive-rest' }
    ])
    expect(state.error).toBeNull()
    expect(heroResult(state, 'BTN')).toBe(20)
  })

  it('illegal action surfaces an error instead of corrupting state', () => {
    const setup = microSetup()
    const state = replayHand(setup, [{ type: 'action', pos: 'UTG', verb: 'check' }])
    expect(state.error).toMatch(/cannot check/)
  })
})
