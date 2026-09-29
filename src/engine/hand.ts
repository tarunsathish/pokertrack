import type { Cents } from './money'
import type { Card } from './cards'
import { positionsFor, preflopOrder, postflopOrder } from './positions'
import { computePots, distributePots, type Pot } from './pots'

export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river']

export type ActionVerb = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'

// User-level events. The hand state is always derived by replaying these,
// which makes undo a simple pop of the last event.
export type HandEvent =
  | { type: 'action'; pos: string; verb: ActionVerb; to?: Cents } // to = raise-to / bet-to amount
  | { type: 'passive-rest' } // everyone still pending folds (facing bet) or checks (no bet)
  | { type: 'board'; cards: Card[] } // flop: 3 cards; turn/river: 1
  | { type: 'showdown'; winners: string[]; shown?: Record<string, Card[]> }

export interface HandSetup {
  tableSize: number
  heroPos: string
  sb: Cents
  bb: Cents
  ante: Cents // per-player ante, 0 if none
  straddles: Cents[] // consecutive straddle amounts starting at UTG, [] if none
  heroStack: Cents | null // hero stack at hand start, if known
}

interface PlayerState {
  pos: string
  committed: Cents // this street
  total: Cents // whole hand (blinds/antes included)
  folded: boolean
  allIn: boolean
  acted: boolean // has acted since the last bet/raise this street
  voluntary: boolean // put money in beyond posted blinds (VPIP)
}

export interface HandState {
  street: Street
  board: Card[]
  players: PlayerState[]
  currentBet: Cents // highest "to" amount this street
  lastRaiseSize: Cents
  toAct: string | null // next position due to act, null when street betting is closed
  bettingClosed: boolean
  handOver: boolean
  winners: string[] | null
  shown: Record<string, Card[]>
  pots: Pot[]
  potTotal: Cents // money in the middle (net of any uncalled refund at hand end)
  won: Record<string, Cents> // final distribution incl. refunds (only when handOver)
  error: string | null // set if an event was illegal during replay
  log: AppliedAction[] // every applied action incl. inferred folds/checks, for display
}

export interface AppliedAction {
  street: Street
  pos: string
  verb: ActionVerb
  to?: Cents
  inferred: boolean
}

function activePlayers(ps: PlayerState[]): PlayerState[] {
  return ps.filter((p) => !p.folded)
}

function contenders(ps: PlayerState[]): PlayerState[] {
  return ps.filter((p) => !p.folded && !p.allIn)
}

function orderFor(street: Street, setup: HandSetup): string[] {
  return street === 'preflop'
    ? preflopOrder(setup.tableSize, setup.straddles.length)
    : postflopOrder(setup.tableSize)
}

function player(state: HandState, pos: string): PlayerState {
  const p = state.players.find((x) => x.pos === pos)
  if (!p) throw new Error(`unknown position ${pos}`)
  return p
}

/** Next player due to act on this street, or null if betting is closed. */
function nextToAct(state: HandState, setup: HandSetup, after?: string): string | null {
  const order = orderFor(state.street, setup)
  const cs = contenders(state.players)
  // Betting closes when 0/1 contenders remain and nobody is owed a call,
  // or all contenders have acted and matched the current bet.
  const someoneOwed = cs.some((p) => p.committed < state.currentBet || !p.acted)
  if (cs.length === 0 || !someoneOwed) return null
  if (cs.length === 1) {
    const lone = cs[0]
    // A lone contender only acts if they still owe chips (e.g. facing an all-in).
    return lone.committed < state.currentBet ? lone.pos : null
  }
  const start = after ? (order.indexOf(after) + 1) % order.length : 0
  for (let k = 0; k < order.length; k++) {
    const pos = order[(start + k) % order.length]
    const p = state.players.find((x) => x.pos === pos)
    if (p && !p.folded && !p.allIn && (p.committed < state.currentBet || !p.acted)) return pos
  }
  return null
}

function checkStreetEnd(state: HandState) {
  if (state.toAct !== null) return
  state.bettingClosed = true
  const live = activePlayers(state.players)
  if (live.length <= 1) {
    endByFolds(state)
    return
  }
  if (state.street === 'river') {
    state.handOver = true // awaiting showdown event
  }
  // If everyone remaining is all-in before the river, the UI keeps dealing
  // board streets (bettingClosed stays true through each).
}

function endByFolds(state: HandState) {
  const live = activePlayers(state.players)
  state.handOver = true
  state.winners = live.map((p) => p.pos)
  settle(state)
}

function settle(state: HandState) {
  const { pots, refunds } = computePots(
    state.players.map((p) => ({ pos: p.pos, total: p.total, folded: p.folded }))
  )
  state.pots = pots
  state.won = state.winners ? distributePots(pots, state.winners, refunds) : {}
  state.potTotal = pots.reduce((s, p) => s + p.amount, 0)
}

function initialState(setup: HandSetup): HandState {
  const seats = positionsFor(setup.tableSize)
  const players: PlayerState[] = seats.map((pos) => ({
    pos,
    committed: 0,
    total: 0,
    folded: false,
    allIn: false,
    acted: false,
    voluntary: false
  }))
  const state: HandState = {
    street: 'preflop',
    board: [],
    players,
    currentBet: 0,
    lastRaiseSize: setup.bb,
    toAct: null,
    bettingClosed: false,
    handOver: false,
    winners: null,
    shown: {},
    pots: [],
    potTotal: 0,
    won: {},
    error: null,
    log: []
  }
  // Post blinds/straddles/antes. Antes are dead money: they go in the pot
  // (total) but do not count toward matching a bet (committed).
  const post = (pos: string, amt: Cents) => {
    const p = player(state, pos)
    p.committed += amt
    p.total += amt
  }
  for (const p of players) if (setup.ante > 0) p.total += setup.ante
  post('SB', setup.sb)
  post('BB', setup.bb)
  const order = preflopOrder(setup.tableSize, setup.straddles.length)
  setup.straddles.forEach((amt, i) => {
    // Straddle seats sit right after BB in seating order.
    const seat = positionsFor(setup.tableSize)[2 + i]
    post(seat, amt)
    state.lastRaiseSize = amt - (i === 0 ? setup.bb : setup.straddles[i - 1])
  })
  state.currentBet = Math.max(setup.bb, ...setup.straddles)
  state.toAct = order[0] ?? null
  state.potTotal = players.reduce((s, p) => s + p.total, 0)
  return state
}

function applyVerb(
  state: HandState,
  pos: string,
  verb: ActionVerb,
  to?: Cents,
  inferred = false
) {
  const p = player(state, pos)
  if (p.folded || p.allIn) {
    state.error = `${pos} cannot act (already ${p.folded ? 'folded' : 'all-in'})`
    return
  }
  state.log.push({ street: state.street, pos, verb, to, inferred })
  switch (verb) {
    case 'fold':
      p.folded = true
      break
    case 'check':
      if (p.committed < state.currentBet) {
        state.error = `${pos} cannot check facing a bet`
        return
      }
      p.acted = true
      break
    case 'call': {
      const owe = state.currentBet - p.committed
      p.committed += owe
      p.total += owe
      p.acted = true
      p.voluntary = true
      break
    }
    case 'bet':
    case 'raise': {
      const target = to ?? 0
      if (target <= state.currentBet) {
        state.error = `${verb} must exceed current bet`
        return
      }
      state.lastRaiseSize = target - state.currentBet
      state.currentBet = target
      const add = target - p.committed
      p.committed += add
      p.total += add
      p.acted = true
      p.voluntary = true
      // Everyone else must act again.
      for (const q of state.players) if (q.pos !== pos) q.acted = false
      break
    }
    case 'allin': {
      const target = to ?? 0
      if (target > state.currentBet) {
        state.lastRaiseSize = target - state.currentBet
        state.currentBet = target
        for (const q of state.players) if (q.pos !== pos) q.acted = false
      }
      const add = target - p.committed
      if (add < 0) {
        state.error = `all-in amount below chips already committed`
        return
      }
      p.committed += add
      p.total += add
      p.allIn = true
      p.acted = true
      p.voluntary = true
      break
    }
  }
}

/** Apply passive defaults (fold facing a bet / check otherwise) to players due to act before `target`. */
function fillTo(state: HandState, setup: HandSetup, target: string) {
  let guard = 0
  while (state.toAct !== null && state.toAct !== target && guard++ < 30) {
    const pos = state.toAct
    const p = player(state, pos)
    const verb: ActionVerb = p.committed < state.currentBet ? 'fold' : 'check'
    applyVerb(state, pos, verb, undefined, true)
    state.toAct = nextToAct(state, setup, pos)
  }
}

function applyEvent(state: HandState, setup: HandSetup, ev: HandEvent) {
  if (state.error) return
  switch (ev.type) {
    case 'action': {
      if (state.handOver) {
        state.error = 'hand is over'
        return
      }
      fillTo(state, setup, ev.pos)
      if (state.toAct !== ev.pos) {
        state.error = `${ev.pos} is not due to act`
        return
      }
      applyVerb(state, ev.pos, ev.verb, ev.to)
      if (state.error) return
      state.toAct = nextToAct(state, setup, ev.pos)
      state.potTotal = state.players.reduce((s, p) => s + p.total, 0)
      checkStreetEnd(state)
      break
    }
    case 'passive-rest': {
      let guard = 0
      while (state.toAct !== null && guard++ < 30) {
        const pos = state.toAct
        const p = player(state, pos)
        const verb: ActionVerb = p.committed < state.currentBet ? 'fold' : 'check'
        applyVerb(state, pos, verb, undefined, true)
        state.toAct = nextToAct(state, setup, pos)
      }
      checkStreetEnd(state)
      break
    }
    case 'board': {
      const idx = STREETS.indexOf(state.street)
      if (idx >= 3) {
        state.error = 'no street after river'
        return
      }
      if (state.toAct !== null) {
        state.error = 'betting not closed'
        return
      }
      state.street = STREETS[idx + 1]
      state.board = [...state.board, ...ev.cards]
      for (const p of state.players) {
        p.committed = 0
        p.acted = false
      }
      state.currentBet = 0
      state.lastRaiseSize = setup.bb
      state.bettingClosed = false
      // If 0 or 1 players can still bet, the street's betting is already closed.
      state.toAct = contenders(state.players).length >= 2 ? orderFor(state.street, setup).find((pos) => {
        const p = state.players.find((x) => x.pos === pos)
        return !!p && !p.folded && !p.allIn
      }) ?? null : null
      if (state.toAct === null) {
        state.bettingClosed = true
        if (state.street === 'river') state.handOver = true
      }
      break
    }
    case 'showdown': {
      state.winners = ev.winners
      if (ev.shown) state.shown = { ...state.shown, ...ev.shown }
      state.handOver = true
      settle(state)
      break
    }
  }
}

/** Replay events from scratch — the single source of truth for hand state. */
export function replayHand(setup: HandSetup, events: HandEvent[]): HandState {
  const state = initialState(setup)
  for (const ev of events) {
    applyEvent(state, setup, ev)
    if (state.error) break
  }
  return state
}

/** Hero's net result for the hand (winnings + refunds − everything put in). */
export function heroResult(state: HandState, heroPos: string): Cents {
  const hero = state.players.find((p) => p.pos === heroPos)
  if (!hero) return 0
  return (state.won[heroPos] ?? 0) - hero.total
}

/** True once the hand needs a showdown decision (river closed with 2+ live players, or everyone all-in with full board). */
export function needsShowdown(state: HandState): boolean {
  return (
    state.handOver && state.winners === null && activePlayers(state.players).length > 1
  )
}

/** True when all remaining players are all-in and board cards still need dealing. */
export function isAllInRunout(state: HandState): boolean {
  return (
    !state.handOver &&
    state.toAct === null &&
    state.bettingClosed &&
    activePlayers(state.players).length > 1 &&
    contenders(state.players).length <= 1 &&
    state.street !== 'river'
  )
}
