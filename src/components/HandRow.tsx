import type { HandRecord } from '../db'
import { fmt, fmtSigned } from '../engine/money'
import { CardsRow } from './MiniCard'

export function HandRow({ hand, onClick }: { hand: HandRecord; onClick?: () => void }) {
  const d = new Date(hand.ts)
  const when = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  return (
    <button className="hand-row" onClick={onClick}>
      <CardsRow cards={hand.heroCards} count={2} small />
      <div className="meta">
        <div className="line1">
          <span className="tag-badge">{hand.heroPos}</span>
          {hand.flagged && !hand.reviewed && <span className="flag-dot" />}
          {hand.tags.slice(0, 2).map((t) => (
            <span className="tag-badge" key={t}>
              {t}
            </span>
          ))}
        </div>
        <div className="line2">
          {when} · pot {fmt(hand.potTotal)}
          {hand.note ? ` · ${hand.note}` : ''}
        </div>
      </div>
      <span className={`result money ${hand.result >= 0 ? 'pos-win' : 'pos-lose'}`}>
        {fmtSigned(hand.result)}
      </span>
    </button>
  )
}
