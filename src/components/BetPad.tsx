import { useState } from 'react'
import { fmt, fmtBB, parseCents, type Cents } from '../engine/money'

interface QuickBet {
  label: string
  amount: Cents
}

/**
 * Bet/raise amount entry: context-aware quick chips + a fallback numpad.
 * All amounts are "to" amounts (raise-to semantics).
 */
export function BetPad({ bb, pot, currentBet, lastRaiseSize, committed, isPreflop, allIn, onConfirm, onCancel }: {
  bb: Cents
  pot: Cents
  currentBet: Cents
  lastRaiseSize: Cents
  committed: Cents // actor's chips already in this street
  isPreflop: boolean
  allIn?: boolean
  onConfirm: (to: Cents) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const typed = parseCents(text)
  const round5 = (c: Cents) => Math.max(Math.round(c / 5) * 5, 5)

  const quicks: QuickBet[] = []
  if (currentBet === 0) {
    // Opening bet postflop: pot fractions.
    quicks.push(
      { label: '⅓ pot', amount: round5(pot / 3) },
      { label: '½ pot', amount: round5(pot / 2) },
      { label: '⅔ pot', amount: round5((pot * 2) / 3) },
      { label: 'pot', amount: pot }
    )
  } else if (isPreflop && currentBet <= bb * 2 && committed < currentBet) {
    // Unraised (or straddled) preflop pot: open in bb multiples of the current bet.
    quicks.push(
      { label: '2x', amount: currentBet * 2 },
      { label: '2.5x', amount: round5(currentBet * 2.5) },
      { label: '3x', amount: currentBet * 3 },
      { label: '4x', amount: currentBet * 4 }
    )
  } else {
    // Facing a bet/raise.
    const min = currentBet + lastRaiseSize
    quicks.push(
      { label: 'min', amount: min },
      { label: '2.2x', amount: round5(currentBet * 2.2) },
      { label: '2.5x', amount: round5(currentBet * 2.5) },
      { label: '3x', amount: currentBet * 3 }
    )
  }

  const amount = typed ?? null
  const valid = amount !== null && (allIn ? amount >= committed : amount > currentBet)
  const verb = allIn ? 'All-in' : currentBet === 0 ? 'Bet' : 'Raise to'

  const key = (k: string) => {
    if (k === '⌫') setText((t) => t.slice(0, -1))
    else if (k === '.' && text.includes('.')) return
    else setText((t) => (t + k).slice(0, 8))
  }

  return (
    <div>
      {!allIn && (
        <div className="quick-row">
          {quicks.map((q) => (
            <button key={q.label} className="chip" onClick={() => onConfirm(q.amount)}>
              <span>{q.label}</span>
              <span className="q-amt num">{fmt(q.amount)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="bet-display money">
        {amount !== null ? (
          <>
            {verb} {fmt(amount)} <span className="sub">{fmtBB(amount, bb)}</span>
          </>
        ) : (
          <span className="sub">{allIn ? 'Enter all-in total' : `${verb} how much?`}</span>
        )}
      </div>
      <div className="numpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
          <button key={k} onClick={() => key(k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="action-grid">
        <button className="btn" onClick={onCancel}>
          Back
        </button>
        <button className="btn primary" disabled={!valid} onClick={() => valid && onConfirm(amount!)}>
          {verb} {amount !== null ? fmt(amount) : ''}
        </button>
      </div>
    </div>
  )
}
