// Canonical position names per table size, listed in SEATING order starting at SB.
// Heads-up: the button posts the SB and acts first preflop, last postflop.
const TABLES: Record<number, string[]> = {
  2: ['SB', 'BB'],
  3: ['SB', 'BB', 'BTN'],
  4: ['SB', 'BB', 'CO', 'BTN'],
  5: ['SB', 'BB', 'UTG', 'CO', 'BTN'],
  6: ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'],
  7: ['SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO', 'BTN'],
  8: ['SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN'],
  9: ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'],
  10: ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN']
}

export function positionsFor(tableSize: number): string[] {
  const t = TABLES[tableSize]
  if (!t) throw new Error(`unsupported table size ${tableSize}`)
  return t
}

/**
 * Preflop action order. Blind posters (SB, BB, then any straddles) act last,
 * in posting order — so with a straddle on, the straddler closes the preflop action.
 * `straddleCount` = number of consecutive straddles starting at UTG (0 for none).
 */
export function preflopOrder(tableSize: number, straddleCount = 0): string[] {
  const seats = positionsFor(tableSize)
  const posters = seats.slice(0, 2 + straddleCount) // SB, BB, straddle seats
  const rest = seats.slice(2 + straddleCount)
  return [...rest, ...posters]
}

/** Postflop action order: seating order from SB. Heads-up: BB acts first (SB is the button). */
export function postflopOrder(tableSize: number): string[] {
  const seats = positionsFor(tableSize)
  if (tableSize === 2) return ['BB', 'SB']
  return seats
}

/**
 * As the button moves each hand, hero's position steps "backward" through the
 * seating list: UTG → BB → SB → BTN → CO → ... Used to pre-fill the next hand.
 */
export function nextPosition(current: string, tableSize: number): string {
  const seats = positionsFor(tableSize)
  const i = seats.indexOf(current)
  if (i === -1) return seats[0]
  return seats[(i - 1 + seats.length) % seats.length]
}
