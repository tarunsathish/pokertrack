// All money is integer cents. Never floats.
export type Cents = number

/** Parse user text like "0.10", ".05", "2", "2.5" into cents. Returns null if invalid. */
export function parseCents(text: string): Cents | null {
  const t = text.trim().replace(/[$,\s]/g, '')
  if (!/^\d*\.?\d{0,2}$/.test(t) || t === '' || t === '.') return null
  const [whole, frac = ''] = t.split('.')
  const cents = Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2))
  return Number.isSafeInteger(cents) ? cents : null
}

/** "$0.10", "$2", "$2.50" */
export function fmt(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const rem = abs % 100
  if (rem === 0) return `${sign}$${dollars}`
  return `${sign}$${dollars}.${String(rem).padStart(2, '0')}`
}

/** Signed with explicit plus: "+$1.20" / "-$0.50" */
export function fmtSigned(cents: Cents): string {
  return cents > 0 ? `+${fmt(cents)}` : fmt(cents)
}

/** Amount expressed in big blinds, e.g. "12.5bb" */
export function fmtBB(cents: Cents, bb: Cents): string {
  if (bb <= 0) return fmt(cents)
  const v = cents / bb
  const rounded = Math.round(v * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}bb`
}
