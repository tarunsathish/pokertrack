import { useState } from 'react'
import { RANKS, SUITS, SUIT_GLYPH, type Card } from '../engine/cards'

/**
 * Rank-then-suit two-tap card entry. 2 taps per card, all targets 44pt+.
 * `used` cards (exact suit known) get their suit key disabled after the rank tap.
 * `allowUnknownSuit` adds an "any" key for logging e.g. AKo without exact suits.
 */
export function CardKeypad({ used, onCard, allowUnknownSuit }: {
  used: Card[]
  onCard: (card: Card) => void
  allowUnknownSuit?: boolean
}) {
  const [rank, setRank] = useState<string | null>(null)

  const pickSuit = (suit: string) => {
    if (!rank) return
    onCard(rank + suit)
    setRank(null)
  }

  return (
    <div>
      <div className="rank-grid">
        {RANKS.map((r) => {
          const allUsed = SUITS.every((s) => used.includes(r + s))
          return (
            <button
              key={r}
              className={`rank-key${rank === r ? ' on' : ''}`}
              disabled={allUsed}
              onClick={() => setRank(rank === r ? null : r)}
            >
              {r}
            </button>
          )
        })}
      </div>
      <div className="suit-row" style={allowUnknownSuit ? undefined : { gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {SUITS.map((s) => (
          <button
            key={s}
            className={`suit-key ${s}`}
            disabled={!rank || used.includes(rank + s)}
            onClick={() => pickSuit(s)}
          >
            {SUIT_GLYPH[s]}
          </button>
        ))}
        {allowUnknownSuit && (
          <button className="suit-key x" disabled={!rank} onClick={() => pickSuit('x')}>
            any
          </button>
        )}
      </div>
    </div>
  )
}
