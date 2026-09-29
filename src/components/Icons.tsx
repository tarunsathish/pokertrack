// SF-Symbols-style tab icons. Filled, single weight, sized to sit with 10pt labels.
const P = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'currentColor' }

export function SpadeIcon() {
  return (
    <svg {...P}>
      <path d="M12 2.5c2.6 3.1 7.5 6.6 7.5 10.4 0 2.3-1.8 4.1-4 4.1-1 0-1.9-.4-2.6-1 .2 1.6.8 3 1.9 4.2.2.2 0 .55-.28.55H9.48c-.28 0-.48-.35-.28-.55 1.1-1.2 1.7-2.6 1.9-4.2-.7.6-1.6 1-2.6 1-2.2 0-4-1.8-4-4.1C4.5 9.1 9.4 5.6 12 2.5Z" />
    </svg>
  )
}

export function CardsIcon() {
  return (
    <svg {...P}>
      <rect x="3.2" y="5.4" width="10.5" height="14.5" rx="2" transform="rotate(-8 8.45 12.65)" opacity="0.45" />
      <rect x="9.5" y="4.2" width="11" height="15.2" rx="2" transform="rotate(7 15 11.8)" />
    </svg>
  )
}

export function ChartIcon() {
  return (
    <svg {...P} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18.5 9.2 12l3.6 3.4L20 7.5" />
      <path d="M14.5 7.5H20v5.5" />
    </svg>
  )
}

export function SlidersIcon() {
  return (
    <svg {...P} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 7.5h9M17.5 7.5H20M4 16.5h2.5M11 16.5h9" />
      <circle cx="15" cy="7.5" r="2.4" />
      <circle cx="8.5" cy="16.5" r="2.4" />
    </svg>
  )
}

/** Chip stack — sessions. Reads as bankroll without borrowing the Stats trend line. */
export function ChipStackIcon() {
  return (
    <svg {...P}>
      <ellipse cx="12" cy="17.6" rx="7.8" ry="2.9" />
      <ellipse cx="12" cy="13.2" rx="7.8" ry="2.9" opacity="0.62" />
      <ellipse cx="12" cy="8.8" rx="7.8" ry="2.9" opacity="0.34" />
    </svg>
  )
}

/** Poker-chip dashed ring — the one domain mark. Used for live-session + empty states only. */
export function ChipRing({ size = 44, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="18" stroke={color} strokeWidth="3.5" strokeDasharray="7.5 4.3" strokeLinecap="butt" />
      <circle cx="22" cy="22" r="10.5" stroke={color} strokeWidth="1.5" opacity="0.55" />
    </svg>
  )
}
