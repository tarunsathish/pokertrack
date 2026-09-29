# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single user — the owner — logging their own live cash-game poker hands and
sessions. No accounts, no multi-user surface, no sharing. The situation is
specific and it governs every design decision: standing or seated at a live
poker table, one hand on the phone, often under bad lighting, with social
pressure not to hold up the game. Entry happens between hands, in seconds, or
it does not happen at all.

Stakes and venue both vary session to session — micro home games through
casino cash games — so the app can never assume a fixed game.

## Product Purpose

Two jobs, in priority order:

1. **Log the hands worth studying** — big pots and tough spots — fast enough
   that logging never costs a hand of attention. Target: a full hand in under
   15 taps / 20 seconds.
2. **Track session results** so the owner knows their real win rate, hourly
   rate, and which games are worth playing.

Success is behavioural, not feature-based: the owner actually logs hands at the
table instead of promising to reconstruct them later, and has a truthful
bankroll figure they trust.

## Positioning

Hand histories are **event-sourced**, not stored as computed results. A hand is
the list of actions the user tapped; all pot math, side pots, uncalled-bet
refunds, and per-street state are replayed from that log on read. This is what
lets every saved hand stay fully editable after the fact, makes undo a single
pop, and keeps a hand at roughly 1.4 KB on disk.

Local-first with no backend is a feature, not a limitation: the app works with
no signal in a casino basement, and a local write is what makes 20-second entry
physically possible.

## Operating Context

- **Device:** iPhone, installed to the home screen as a PWA. Portrait only.
- **Deployed** as a static site (Vercel) — no server, no API, no env vars.
- **Storage:** IndexedDB via Dexie for sessions and hands; localStorage for
  settings and in-progress hand drafts so a mid-hand app kill loses nothing.
  Data is per-device and per-origin; there is no sync.
- **Session ritual:** sit down → set blinds/buy-in/venue → log selected hands
  during play → rebuy as needed → cash out. Review of flagged hands happens
  later, away from the table.
- **Backup:** manual JSON export through the iOS share sheet. Restore replaces
  local data wholesale; it is a restore, not a merge.

## Capabilities and Constraints

- **All money is integer cents.** Never floats, anywhere.
- **Blinds are fully user-defined**, including micro-stakes like $0.05/$0.10,
  and SB may equal BB. Bet-sizing shortcuts derive from BB and pot — never
  hardcoded dollar amounts.
- Amounts use **"raise to"** semantics, never "raise by".
- Skipped players get **inferred passive actions** (fold facing a bet, check
  otherwise) so the user only taps players who did something.
- **Everything on a saved record stays editable**, and unknown values (`x`
  suits) are legal. This extends to sessions, not just hands.
- **No confirmation dialogs in the logging flow** — undo instead. Two-tap
  confirm is acceptable for destructive deletes.
- Trust-critical paths are the pot/side-pot math and straddle-aware action
  order; they carry a unit-test suite that must stay green.
- Hand-derived statistics cover only the hands the user chose to log, so they
  are study material, never a win-rate claim. Session results are the real
  scoreboard, and the UI must keep saying so.

## Brand Commitments

- **Name:** PokerTrack.
- **Committed visual world: "Cupertino glass"** — full Apple design language,
  documented in `CLAUDE.md` and `docs/research/craft-playbook.md`. This is a
  settled direction, not a starting point, and it overrides generic defaults.
  Binding specifics: SF system type throughout with SF Rounded for hero money
  numerals and tabular figures always; the iOS type scale; capsule controls and
  inset-grouped lists; Liquid Glass chrome with a floating capsule tab bar;
  backdrop-filter restricted to large surfaces; three table-felt backgrounds;
  gold `--brass` as the single accent; win/loss color on data only; drawn SVG
  icons and never emoji.
- **Phone template is binding:** the app is width-capped at 430px and centered
  with side hairlines on wide screens. It must never render as a full-width
  website.
- **Voice:** plain, second-person, poker-literate. Speaks the table's own
  language ("Sitting down?", "in for", "Rebuy", "raise to"). No marketing tone,
  no exclamation marks, no coaching or moralizing about results.

## Evidence on Hand

- `docs/research/craft-playbook.md` — the craft rules the design system
  follows, with its own AI-tells checklist already applied.
- `docs/research/design-research.md` and `competitor-research.md` — prior
  product and competitor research.
- `src/engine/engine.test.ts` — 21 passing tests over the betting engine.
- No users besides the owner, no testimonials, no usage data, no benchmarks.
  Future work must not fabricate any of these.

## Product Principles

1. **Speed of entry outranks everything.** Any change that adds taps to the
   logging path must justify itself against that cost, and the hot path stays
   unanimated.
2. **The record is the event log.** Derive state; never mutate it. Editability
   after the fact is a guarantee, not a feature.
3. **Never overstate what the data proves.** Logged hands are a biased sample
   and the UI says so where the numbers appear.
4. **Local-first, offline-always.** No feature may assume connectivity.
5. **The committed Apple world decides taste questions.** Match the platform a
   fluent iPhone user already knows instead of inventing chrome.

## Accessibility & Inclusion

- Touch targets meet the 44px floor; the app is used one-handed.
- `prefers-reduced-motion` is respected.
- Dark-first by use scene (dim poker rooms), and contrast must hold there:
  body text ≥4.5:1, large text ≥3:1, with secondary ink as opacity steps of a
  near-white rather than ad-hoc grays.
- Money figures use tabular numerals so columns stay scannable at a glance.
