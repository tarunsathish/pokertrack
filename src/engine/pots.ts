import type { Cents } from './money'

export interface Contribution {
  pos: string
  total: Cents // total chips this player put in across all streets
  folded: boolean
}

export interface Pot {
  amount: Cents
  eligible: string[] // positions eligible to win this pot
}

/**
 * Layered main/side pot computation.
 * Before layering, any uncalled excess (the amount by which the largest
 * contribution exceeds the second largest among non-folded players) is
 * returned to its owner — standard uncalled-bet rule.
 */
export function computePots(contribs: Contribution[]): { pots: Pot[]; refunds: Record<string, Cents> } {
  const refunds: Record<string, Cents> = {}
  const live = contribs.filter((c) => !c.folded)
  const totals = new Map(contribs.map((c) => [c.pos, c.total]))

  if (live.length >= 1) {
    const sorted = [...live].sort((a, b) => b.total - a.total)
    const top = sorted[0]
    const second = sorted[1]?.total ?? 0
    // Also cap by the largest folded contribution: folded money at a level is still won.
    const maxFolded = Math.max(0, ...contribs.filter((c) => c.folded).map((c) => c.total))
    const callLevel = Math.max(second, Math.min(top.total, maxFolded))
    if (top.total > callLevel) {
      refunds[top.pos] = top.total - callLevel
      totals.set(top.pos, callLevel)
    }
  }

  // Layer pots at each distinct live-contribution level.
  const levels = [...new Set(live.map((c) => totals.get(c.pos)!).filter((t) => t > 0))].sort((a, b) => a - b)
  const pots: Pot[] = []
  let prev = 0
  for (const level of levels) {
    let amount = 0
    for (const c of contribs) {
      const t = totals.get(c.pos)!
      amount += Math.max(0, Math.min(t, level) - prev)
    }
    const eligible = live.filter((c) => totals.get(c.pos)! >= level).map((c) => c.pos)
    if (amount > 0) pots.push({ amount, eligible })
    prev = level
  }

  // Edge case: everyone folded to a bet — money above live levels from folded players
  // (shouldn't happen: folded totals never exceed the call level they faced).
  // Any remainder from folded contributions above the top live level:
  const accounted = pots.reduce((s, p) => s + p.amount, 0) + Object.values(refunds).reduce((s, r) => s + r, 0)
  const totalIn = contribs.reduce((s, c) => s + c.total, 0)
  const remainder = totalIn - accounted
  if (remainder > 0 && pots.length > 0) pots[pots.length - 1].amount += remainder

  return { pots, refunds }
}

/**
 * Distribute pots to winners. `winners` = user-selected winning position(s).
 * Each pot goes to the selected winners who are eligible for it (split evenly,
 * odd cents to the first). If none of the selected winners are eligible for a
 * side pot, it goes to its eligible players (split) — matching real rules where
 * a short-stack winner only takes the pots they're in.
 */
export function distributePots(
  pots: Pot[],
  winners: string[],
  refunds: Record<string, Cents>
): Record<string, Cents> {
  const won: Record<string, Cents> = { ...refunds }
  for (const pot of pots) {
    let takers = winners.filter((w) => pot.eligible.includes(w))
    if (takers.length === 0) takers = pot.eligible
    if (takers.length === 0) continue
    const share = Math.floor(pot.amount / takers.length)
    let leftover = pot.amount - share * takers.length
    for (const t of takers) {
      won[t] = (won[t] ?? 0) + share + (leftover > 0 ? 1 : 0)
      if (leftover > 0) leftover--
    }
  }
  return won
}
