# Design Research: Speed-First Live Poker Hand Logger (iPhone PWA)

Research conducted 2026-09-02.

## (a) Catalog of fast-entry patterns — who uses them and why they work

### 1. Count actions, not features — the MacroFactor doctrine
MacroFactor (Stronger By Science) built an actual metric: the **Food Logging Speed Index** — the number of *discrete actions* (taps, keystrokes) to complete a workflow. They audited 20 competitor loggers; MacroFactor completes standard workflows in 24 actions vs. Cronometer's 40. Principles that map directly:

- **Quick-add is the floor**: their fastest workflow is 4 actions. Design a "minimum viable hand" loggable in ~6–10 taps; every extra detail optional.
- **Saved defaults beat search**: serving sizes remembered from last time. Competitors requiring re-selection ballooned to 10+ actions.
- **No submission step where avoidable.**
- **Batching**: log many items without re-launching the flow.

**Actionable metric:** define a "Hand Logging Speed Index." Target: a standard hand (hole cards + position + preflop raise/call + fold on flop) in **under 15 taps and under 20 seconds**, one-handed. Instrument it and regress it every release.

### 2. Workout trackers (Strong, Hevy): pre-fill from last time, tap-to-confirm
Every new set is **pre-filled with the previous set's weight and reps**; the user's action is a single checkmark tap. Numbers edited with a large custom numeric pad or +/− steppers only when they change.

**Translation to poker:** carry forward everything that rarely changes between hands — table size, blinds, straddle on/off, currency/bb mode, hero's stack (minus last hand's result). Per hand, the only things that always change: position (decrements one seat each hand — **auto-rotate it**), cards, and action. The app should *guess* your position and you confirm with zero taps or fix with one.

### 3. Scorekeeping apps (golf, darts): one screen per unit, giant steppers, modal defaults
Golf apps converge on: one hole per screen, score pre-set to **par** (the statistically likely value), giant +/− steppers, auto-advance to the next hole.

- **Default to the modal outcome** (in poker: fold/check/standard-open are modal actions).
- **Auto-advance**: entering a value moves to the next field without a "next" tap. Selecting the second hole card auto-advances to action; completing a street auto-advances to the next street.
- **Anti-pattern**: 18Birdies' top complaint is interruptions (popups, upsells) *during scoring*. Never interrupt mid-hand. No modals during a live hand, ever.

### 4. Expense trackers: quick-add now, enrich later
Separate **capture** from **curation**. At the table: capture the skeleton (cards, positions, amounts). Annotation (villain reads, notes, tags) happens later at home. Provide a one-tap "review later" flag and a post-session review queue.

### 5. Undo instead of confirm (NN/g)
Confirmation dialogs slow every interaction to protect against rare errors, and users tap through them blindly. The forgiving-design pattern: **commit immediately, show a transient toast with Undo** (Gmail delete).

- Every action commits instantly; a small Undo affordance + a persistent "back one step" button replaces all confirmations.
- The only acceptable confirm: destructive, irreversible bulk actions (delete session).
- Maintain the hand as an **event log** internally so undo is a pop of the last action — this also gives free step-back editing and a replayer.

### 6. Dedicated live-poker loggers — lessons
- **GrindStack**: a custom poker keyboard with shorthand tokens — validates that a domain-specific input surface crushes the system keyboard.
- **LiveHands**: killer feature is **PokerStars-format export** so hands flow into PokerTracker/GTO tools/coaches. Standard-format export is a first-class requirement.
- **Fastroll**: AI shorthand parsing — type `utg 15 co c hero 3b 45 AKss` → structured hand. A free-text parser fallback lane complements structured taps.
- **SnapHand / Live Poker Hands Logger**: "distraction-free input flow," straddle support, **automatic winner/pot detection** — the app computes the pot from logged bets; the user never does mental math.
- **2+2 reality check**: many live players still use voice memos or Notes shorthand because apps are too slow; many rooms prohibit phone use mid-hand. The app must support **logging after the hand ends** (30–60 s reconstruction) as the primary use case. Ask for things in the order players remember them: hole cards → position → action sequence.

### Pattern summary table

| Pattern | Exemplar | Why it's fast |
|---|---|---|
| Pre-fill from last entry, tap to confirm | Strong/Hevy sets | Typing → confirming (1 tap vs ~5) |
| Default to modal value | Golf par default | Most-likely value needs 0 edits |
| Auto-advance between fields | Golf hole flow | Removes every "Next" tap |
| Domain-specific keypad | GrindStack poker keyboard | No system keyboard, big targets, only valid tokens |
| Quick-add skeleton + enrich later | MacroFactor quick add | Capture cost minimized at the table |
| Commit + Undo toast, no confirms | Gmail/NN/g | Zero-cost happy path |
| Auto-computed derived values (pot, stacks, winner) | SnapHand | User never enters what the app can calculate |
| Standard-format export | LiveHands → PokerTracker | Serious-player adoption driver |
| Chips/segmented buttons over dropdowns | All of the above | 1 tap, visible options, no scroll |

## (b) Recommended card-picker design

### The two known patterns
**Flat 52-card grid** (Equilab mobile): one tap per card, but on iPhone portrait 13 columns yields ~27 pt cells — far below Apple's 44 pt minimum; fat-finger errors. Reject in portrait.

**Rank-then-suit two-tap** (PokerCruncher): tap a rank (13 buttons), then a suit (4 buttons). 2 taps per card, every target huge. PokerCruncher's longevity validates it.

### Recommendation: two-row rank pad + suit row, auto-advance
Fixed card keypad in the bottom half of the screen:

- **Rank pad**: 13 keys in two rows (A K Q J T 9 8 / 7 6 5 4 3 2), each ≈ 52×56 pt. High→low, left→right — players think in descending ranks.
- **Suit row**: 4 keys below, each ≈ 88×60 pt, large colored glyphs (four-color deck).
- **Two taps per card, zero navigation**: rank → suit → card slots into the current position (hole 1 → hole 2 → done), rank pad re-activates. Both hole cards = 4 taps; full board = 10 taps.
- **Auto-disable dead cards**: used cards gray out — impossible-state prevention with no dialogs.
- **"Unknown suit" key ("x")**: log "AKo" in 4 taps when suits don't matter; backfill later. A differentiator no competitor offers cleanly.
- **Slot targets are buttons**: hole/board slots tappable to re-select — fix a mis-entry in 3 taps, no clear-all.
- Optional power layer: **swipe from a rank key in 4 directions to pick suit** (up=♠, left=♥, right=♦, down=♣) — one gesture per card. Ship two-tap first; add swipe as opt-in.

**Reject**: scrolling pickers/wheels, the system keyboard ("Ah" typing), flat 52-grid in portrait.

## (c) One-handed layout guidelines (specific numbers)

- **Tap targets**: Apple HIG min **44×44 pt**; use **48–56 pt** for primary controls (action buttons, rank/suit keys). WCAG floor 44.
- **Spacing**: ≥ 8 pt between interactive elements; for the rank pad keep ≥ 6–8 pt gutters and extend the *hit area* into the gutter (visual key smaller than touch key).
- **Thumb zones** (Hoober's research): natural zone is the **bottom-center third**; top quarter is hard reach. On iPhone 15/16 Pro (393×852 pt): all per-hand input controls in the **bottom ~420 pt**; top ~200 pt display-only (hand state, pot, board).
- **Layout stack (bottom → top)**: action/keypad zone (bottom 300–380 pt, above home-indicator safe area) → context strip (street, pot, effective stacks) → read-only hand summary at top. Primary CTA dead-center-bottom.
- **Bottom panels, not modal sheets**: card keypad and bet pad are *persistent panels that swap in place* — animation time is entry time.
- **No top-of-screen interactions during a hand.** Undo, back-one-step, and save live at the bottom.
- **Avoid edge-swipe dependence**: iOS system gestures collide with app gestures in standalone PWAs; keep custom gestures away from edges, always provide button equivalents.
- **Handedness setting**: left-hand mirror mode; cheap if planned early.
- **Bet-amount entry** (its own control, never a keyboard):
  1. **Chip-step buttons** matched to stakes (at 2/5: +5 +25 +100)
  2. **Pot-fraction row** (⅓, ½, ⅔, pot, all-in) — the app knows the pot; one tap = exact amount
  3. **Min-raise and 2.2x/3x last-bet chips**
  4. Fallback 0–9 pad
  - Toggle $/bb globally; store both. Call/check/fold need zero amount entry.

## (d) iOS PWA capabilities & gotchas (2025/2026)

### Reliable (installed to Home Screen, iOS 17+)
- **Standalone display mode** via manifest, custom icon/splash.
- **Service workers + Cache Storage** for full offline. Precache the whole app shell — must work with zero signal.
- **IndexedDB + `navigator.storage.persist()`** — fully supported since Safari 17/iOS 17; request on first launch; once granted, eviction skips the origin.
- **Screen Wake Lock** — supported since iOS 16.4. Hold during active sessions.
- **Web Push + Badging** (16.4+, installed only) — optional.
- **Haptics: unavailable.** `navigator.vibrate` never implemented; the checkbox-switch hack was patched (~iOS 26.5). Substitute crisp visual state changes (100–150 ms key flashes) + optional audio ticks.
- **No Background Sync/Fetch** — sync only while foregrounded; design as opportunistic.

### Storage/eviction rules, precisely
- The 7-day ITP storage cap applies to sites *in Safari*. **Home-screen web apps are exempt** (per WebKit docs). Installed PWA + persist() = two layers of protection.
- Quota: up to ~60% of disk — never the problem. Hand histories are tiny text.
- **User actions still nuke data**: "Clear History and Website Data" can wipe PWA storage; deleting the icon deletes its data → layered backup plan required.

### Data-persistence architecture (belt and suspenders)
1. **IndexedDB as source of truth** (Dexie wrapper), structured as an append-only event log per hand (powers undo + replay).
2. First launch post-install: call `navigator.storage.persist()`; show a subtle "protected" indicator; re-check `persisted()` each launch.
3. **Write every action immediately** (per-tap commits). Flush on `visibilitychange → hidden` (the only reliable iOS lifecycle signal; `beforeunload` is not).
4. **Install prompt**: no `beforeinstallprompt` on iOS — show manual "Share → Add to Home Screen" instructions; detect standalone via `matchMedia('(display-mode: standalone)')`. Steer users to install before their first real session (uninstalled Safari usage is where 7-day eviction genuinely applies).
5. **Export as safety valve**: one-tap export as JSON backup + PokerStars-format text. Web Share API to Files/AirDrop/Messages. Periodic "40 unexported hands — back up?" nudges.
6. Cloud sync optional later; ship local-first.

### UI-level iOS gotchas
- Inputs < 16px font trigger auto-zoom on focus → `font-size: max(16px, 1em)` on all inputs (custom keypads avoid focus entirely). Viewport: `user-scalable=no, maximum-scale=1`; `touch-action: manipulation` on buttons.
- `viewport-fit=cover` mandatory or all `env(safe-area-inset-*)` = 0. Pad bottom bar with `env(safe-area-inset-bottom)` (~34 pt).
- 100vh lies in Safari → use `100dvh`/`100svh` + VisualViewport API.
- Disable long-press callouts/selection on controls: `-webkit-touch-callout: none; user-select: none; -webkit-tap-highlight-color: transparent` (supply own pressed states).
- `overscroll-behavior: none` on body; scroll only inside designated panes.

## (e) Visual design recommendations

### Dark-first, dim-room-tuned
- **Dark mode is the default and primary theme.** Background **#121212–#1A1A1A**, not pure black (OLED halation/smearing). Elevated surfaces step up (#1E1E1E → #242424).
- **Text**: off-white #E0E0E0–#EDEDED, never pure white for body. Body ≥ 4.5:1 contrast; key numbers (pot, current bet) 7:1+ and **large**: 28–34 pt semibold. Test: readable at arm's length in one glance.
- **Desaturate accents in dark mode** except the four suit colors.

### Four-color deck — non-negotiable
Standard mapping (PokerStars/GG convention, pre-learned):
- ♠ white/near-white on dark · ♥ red ~#E5484D · ♦ blue ~#3B82F6 · ♣ green ~#30A46C
- ≥ 3:1 contrast against dark surface. **Redundant-code suits** (color + glyph always together) for color-vision deficiency. Two-color toggle for traditionalists; default four-color.

### Card rendering
- Render cards as **mini playing cards** (rank ≥ 17 pt bold + suit glyph on a rounded rect), not text like "Ah".
- Empty slots = dashed outlines labeled flop/turn/river, doubling as edit buttons.
- No felt skeuomorphism on input screens; flat dark-neutral so suit colors + amber highlights own all the chroma. Subdued dark green (#1B3B2F-ish) acceptable in the replayer only.

### Action/state color language
- One **amber/gold accent** for the active control and primary CTA.
- Semantic colors in the hand timeline: fold = muted gray, check/call = blue-gray, bet/raise = amber, all-in = red — a hand becomes scannable as a color pattern.
- Pressed states: 100–150 ms bright flash + slight scale (the haptics substitute).

### Glanceability & etiquette
- **One question per screen state** ("Hero's cards?" → "Action?" → "Flop?"), answer controls under the thumb.
- Keep overall luminance low; consider an extra-dim "stealth" toggle.
- SF Pro / system stack; **`font-variant-numeric: tabular-nums`** for all amounts.

## Synthesis: the target interaction loop

Hand ends → pull phone out → app already shows a fresh hand pre-filled (position auto-rotated, same blinds/table/stack) → 4 taps for hole cards → action logger with modal-action defaults and pot-fraction bet chips, auto-computed pot/call amounts → auto-advance through streets → outcome (won/lost inferred from last aggression + one showdown tap) → "Hand saved · Undo" toast → phone back in pocket. Every tap commits to IndexedDB instantly; persist() granted; installed to home screen; wake lock during session; PokerStars export one tap away. **Under 15 taps, under 20 seconds, entirely in the bottom half of the screen, readable in a dim room at a glance.**

## Sources

[MacroFactor FLSI](https://macrofactor.com/fastest-food-logger/) · [FLSI 2025 update](https://macrofactor.com/fastest-food-logger-2025/) · [Hevy vs Strong](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026) · [Upswing: equity calculators](https://upswingpoker.com/best-poker-odds-and-equity-calculators/) · [PokerCruncher tutorial](https://www.pokercruncher.com/ipPokerCruncherTutorial.html) · [LiveHands (poker.org)](https://www.poker.org/en-US/latest-news/livehands-the-game-changing-app-built-to-simplify-live-poker-hand-logs/) · [GrindStack](https://play.google.com/store/apps/details?id=com.acesup.pokeranalyzer) · [Fastroll](https://fastrollpoker.com/) · [Thumb zone guide](https://parachutedesign.ca/blog/thumb-zone-ux/) · [NN/g: bottom sheets](https://www.nngroup.com/articles/bottom-sheet/) · [NN/g: confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/) · [WebKit: storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) · [WebKit: tracking prevention](https://webkit.org/tracking-prevention/) · [MDN: storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) · [MagicBell: iOS PWA limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) · [caniuse: Wake Lock](https://caniuse.com/wake-lock) · [CSS-Tricks: 16px iOS zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/) · [PokerNews: four-color deck](https://www.pokernews.com/pokerterms/four-color-deck.htm) · [Dark mode principles](https://uxcel.com/blog/12-principles-of-dark-mode-design-627) · [WCAG dark mode](https://www.colorcontrast.org/blog/dark-mode-contrast-accessibility-guide/)
