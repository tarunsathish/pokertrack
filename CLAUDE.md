# PokerTrack

iPhone-first PWA for logging and reviewing live cash-game poker hands. Single user, no backend, no accounts. The #1 product requirement is **speed of entry** (target: full hand under 15 taps / 20 seconds). Product research and design rationale live in `docs/research/`.

## Commands

- `npm run dev` — dev server on LAN (`--host`); open the Network URL on the iPhone (same wifi)
- `npm run build` — typecheck (`tsc -b`) + production build with PWA service worker
- `npm run test` — vitest engine suite

## Architecture

- **All money is integer cents** (`src/engine/money.ts`). Never floats. Blinds are fully user-defined (micro-stakes like $0.05/$0.10; SB may equal BB).
- **Hands are event-sourced** (`src/engine/hand.ts`): a `HandEvent[]` log replayed via `replayHand(setup, events)` — undo is a pop, edits are replays. Never mutate hand state directly.
- Skipped players get **inferred passive actions** (fold facing a bet, check otherwise) — the user only taps actors who did something.
- Pot math incl. side pots / uncalled-bet refunds is in `src/engine/pots.ts`; straddle-aware action order in `src/engine/positions.ts`. These are the trust-critical paths — keep `src/engine/engine.test.ts` green and add a test for any betting edge case touched.
- Storage: Dexie/IndexedDB (`src/db.ts`), settings in localStorage (`src/settings.ts`), in-progress hand drafts in localStorage (survive app kills).
- UI: React 19 + Vite, single `src/styles.css` design system. No router — tabs in `App.tsx`, full-screen flows are fixed overlays.
- Design identity — **"Cupertino glass"** (user's final direction: full Apple design language; see `docs/research/craft-playbook.md` for craft rules): SF system type everywhere (`--sans`; `--round` = SF Rounded for all big money/hero numbers, always tabular-nums; no custom webfonts), Apple type scale (34/700 large titles, 13/500 caps section headers, −0.022em body tracking), iOS capsule buttons/pills, inset-grouped lists (`.group`). **Liquid Glass chrome** (iOS 26): floating capsule tab bar with a sliding `.tab-lens` (Instagram-style glide, 380ms overshoot curve), glass materials via `--glass*` tokens; backdrop-filter only on large surfaces (tabbar/panel/groups/cards/toast), small controls translucent + specular shine. Background world = the three table felts (green/midnight/noir ladders + lamplight + grain), gold `--brass` as the single accent, cream card stock only on playing cards. `--win`/`--loss` only on data; SVG icons in `src/components/Icons.tsx`, never emoji. **Phone template**: `#root` and `.overlay` are `max-width: var(--phone-w)` (430px) centered with side hairlines on wide screens — the app must never render as a full-width website; the tabbar is width-capped to match.

## Conventions

- Amounts are "raise **to**" semantics, never "raise by".
- Bet-sizing quick buttons derive from BB and pot — never hardcode dollar amounts.
- No confirmation dialogs in the logging flow; undo instead. (Two-tap confirm is OK for deletes.)
- Everything on a saved hand must remain editable after the fact; unknown values (`x` suits) are allowed.
