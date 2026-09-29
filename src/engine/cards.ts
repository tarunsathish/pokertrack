// A card is a 2-char string: rank + suit. Suit 'x' means "unknown / doesn't matter".
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
export const SUITS = ['s', 'h', 'd', 'c'] as const
export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
export type Card = string // e.g. "Ah", "Td", "Kx"

export const SUIT_GLYPH: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣', x: '?' }

export function cardRank(c: Card): string {
  return c[0]
}
export function cardSuit(c: Card): string {
  return c[1]
}

/** Exact-card collision only applies when both suits are known. */
export function isCardUsed(card: Card, used: Card[]): boolean {
  if (cardSuit(card) === 'x') return false
  return used.includes(card)
}

/** Human string like "A♥ K♠" */
export function fmtCards(cards: Card[]): string {
  return cards.map((c) => cardRank(c) + SUIT_GLYPH[cardSuit(c)]).join(' ')
}
