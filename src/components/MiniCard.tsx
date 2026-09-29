import { cardRank, cardSuit, SUIT_GLYPH, type Card } from '../engine/cards'

export function MiniCard({ card, small, activeSlot, label, onClick }: {
  card: Card | null
  small?: boolean
  activeSlot?: boolean
  label?: string
  onClick?: () => void
}) {
  const cls = ['mini-card', small ? 'sm2' : '']
  if (card) {
    cls.push(cardSuit(card))
  } else {
    cls.push('empty')
    if (activeSlot) cls.push('active-slot')
  }
  const inner = card ? (
    <>
      <span>{cardRank(card)}</span>
      <span className="suit">{SUIT_GLYPH[cardSuit(card)]}</span>
    </>
  ) : (
    <span>{label ?? ''}</span>
  )
  return onClick ? (
    <button className={cls.join(' ')} onClick={onClick}>{inner}</button>
  ) : (
    <span className={cls.join(' ')}>{inner}</span>
  )
}

export function CardsRow({ cards, count, small, activeIndex, labels, onSlot }: {
  cards: Card[]
  count: number
  small?: boolean
  activeIndex?: number
  labels?: string[]
  onSlot?: (i: number) => void
}) {
  return (
    <span className="cards-row">
      {Array.from({ length: count }, (_, i) => (
        <MiniCard
          key={i}
          card={cards[i] ?? null}
          small={small}
          activeSlot={i === activeIndex}
          label={labels?.[i]}
          onClick={onSlot ? () => onSlot(i) : undefined}
        />
      ))}
    </span>
  )
}
