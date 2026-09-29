# Competitive Research: Live Cash-Game Hand Tracking Apps

Research conducted 2026-09-02 via app store listings, product sites, forum threads (TwoPlusTwo, Poker Chip Forum, Red Chip Poker), and the academic PHH hand-history spec.

---

## (a) Competitive Landscape Table

| Product | Category | Platform | Hand entry? | Entry method | Pricing | Rating (US App Store) | Status |
|---|---|---|---|---|---|---|---|
| **Poker Bankroll Tracker** (Pixelnomads) | Session/bankroll + tools | iOS, Android, Web | Yes (replayer-based) | Manual: input hand, board, betting into replayer | Free w/ ads; Pro $29.99/yr; Lifetime $199.99 | 4.2 (93 ratings US; 100k+ Android downloads) | Active, market leader by installs |
| **Poker Analytics 7** (Stax River, formerly PA6) | Session/bankroll + hands | iOS, iPad (v7); Android (v6) | Yes | "Super fast hand recorder," click-through street-by-street | Free (1 record/mo); $14.99/yr (52 records); $29.99/yr unlimited; ~$43.95 top tier | 4.8 (1,300+) | Active; premium positioning |
| **Left Pocket** | Session/bankroll | iOS only (iOS 18+) | Yes — **AI voice/text → hand history** | "Speak or type a hand while playing — AI converts to standard hand history format" | Free; Pro $2.99–9.99/mo, $39.99–79.99/yr, $149.99 lifetime | 4.7 (109) | Active, fast-moving indie |
| **Pokerbase** | Session/bankroll + social/staking | iOS, Android | Yes (basic recorder + replayer) | Hand recorder during live sessions, share via link/feed | Freemium + Pro | ~30k users; PokerNews' #1 pick | Active |
| **Poker Income Ultimate** | Session/bankroll | iOS | Partial (opponent stats, hand-by-hand logging) | Manual | Free + $0.99–9.99 IAPs | 4.7 (5,100+) | **Stale — last update v14.3, March 2018** |
| **RunGood** | Session/bankroll | iOS | No | — | ~$10 one-time | Was well-liked on 2+2 | **Abandoned; pulled from App Store** |
| **Share My Pair** | Hand replayer/sharing | iOS, Android, Web | Yes (recreate + share) | Manual recreation, video clips for social | Was free | 38k hands created, 4.2M views; Hellmuth/Little endorsements | **Dead — site and app "effectively unusable" as of 2026** |
| **Pokerscope** | Hand recorder + study suite | iOS (+web replayer) | **Yes — core focus** | Shorthand-note parser + manual table entry | **Completely free, no ads** | 5.0 (17) | Active |
| **HandRecorder** (Hans Kastel Hard) | Hand recorder + bankroll | iOS 17.6+ | **Yes — core focus** | Radial seat picker, context-aware action tiles, "under 3 seconds" claim | Free; Plus/Premium tiers; GTO tools $14.99/mo–$129.99/yr; Omaha $19.99/yr | Too few ratings | New, active |
| **Live Solver** (Players Pal) | Hand recorder → solver export | iOS 15.1+ | **Yes — core focus** | Tap-through 4 streets, visual table, auto-draft save | Free; Pro ~$9 for auto-export/desktop connector | Too few ratings | New, active |
| **GrindStack** | Notes + hands + AI coach | iOS | Yes (shorthand keyboard) | Custom poker shorthand keyboard + AI analysis | Free; Pro $4.99/wk, $10.99/mo, $99.99/yr | 4.4 (7) | New, active |
| **Fastroll Poker** | Live hand database | iOS, Android | **Yes — core focus** | "Built with speed in mind"; logs cards, villains, stacks, action; exports to text / Crush Live Call-ins | Freemium | Small | Active |
| **Poker Memo** (Woodspoon, 2014) | Hand recorder | iOS | Yes | Tap controls instead of typing | Cheap/one-time | Old but referenced on forums | Aging |
| **Poker Hand Note** | Hand recorder | iOS, Android | Yes | "No typing, just tap" memos + replayer | Unclear | 4.3 (12), <1k downloads | Marginal |
| **Poker Hand History Keyboard** | iOS custom keyboard | iOS | Text-assist only | Keyboard with poker term shortcuts for use inside Notes | Cheap | Niche but recommended on 2+2/PCF | Active |
| **Bink** | Bankroll/graphs | iOS | No | — | Freemium | Praised for graphs/design | Active |
| **PokerTracker 4 / HM3 / DriveHUD** | Desktop online trackers | Win/Mac | Auto-import only (no manual live entry) | Parses online HH files | PT4 ~$64–99 one-time | Industry standard | Concepts translate; product doesn't |
| **PokerCruncher** | Equity calculator | iOS/Android/Mac | N/A | Range vs range equity, up to 10 players | $12.99 one-time | Top-rated calculator | Active; the standard companion app |
| **Free web replayers** (MyPokerCoaching, Upswing converter, pokerhandreplayer.com) | Replay/share | Web | Yes | Web forms, mobile-optimized | Free | — | Active |

---

## (b) Per-App Deep Dives on Hand-Entry UX

### Poker Bankroll Tracker (PBT)
- **Entry flow:** Hand entry lives inside the replayer. "You basically just input your hand, the board and betting and you get a complete hand history for the big hands of the night." Supports Hold'em, Omaha, 5-Card Omaha, and unusually rich live-game variants: **bomb pots, double boards, run-it-twice, straddles**.
- **Stats:** hourly rate, win rate per 100 hands, % sessions won; self-VPIP/PFR/3BetPF derived from recorded hands; chip graph during live sessions; variance calc; 40+ currencies; CSV import/export; public API.
- **Praise:** "every feature you could possibly want"; live-rail social feature is unique.
- **Complaints:** ads in free tier, filter limitations, formatting nits, dated/cluttered UI relative to newer apps. Hand entry is a secondary feature, not tuned for at-the-table speed.
- **Takeaway:** feature-maximal, entry-speed-agnostic. The replayer treats hand entry as a reconstruction task, not a live-capture task.

### Poker Analytics 6/7
- **Entry flow:** marketed as "super fast hand recorder": "An input flow built for speed at the table — log a key hand in the moment without missing the action, then replay it when it's time to review." A simple click-through process to record a hand while it is being played or after it ends, tracking position, chip stacks, player notes, rake. Street-by-street replay, share via text or **export to video**.
- **Stats:** exact profits, $/hr, **BB/100**, optimal session duration, day-of-week/game/location comparisons, win/loss calendars, location maps; equity + ICM calculators; variance simulator; opponent notes; tax exports.
- **Praise:** "light years ahead of any other poker software in design"; responsive support.
- **Complaints:** **price**, learning curve on custom reports, and the free tier is nearly unusable for hands (1 hand record/month — hand recording is the paywall lever).
- **Takeaway:** the highest-quality incumbent recorder; its monetization (metering hand records) is a direct opening for a competitor.

### Left Pocket
- **Entry flow (differentiated):** **AI conversion — "speak or type a hand while playing—our AI instantly converts your story into standard hand history format."** The only incumbent doing voice/natural-language hand capture.
- **Other:** lock-screen live session widget, floating timer, expenses, tags, staking, multi-day tournaments, health integration, and importers for Pokerbase/PBT/Poker Analytics with "AI auto-detection."
- **Stats:** win rate, $/hr, **BB/hr**, ROI, ITM, by stakes/time-of-day/location.
- **Praise:** clean modern layout, analytics depth. **Complaints:** iOS 18+ only, hand features are new/thin vs. PA7's structured recorder; small user base.
- **Takeaway:** validates voice/NL entry as an entry-speed strategy; also validates paying for import paths from competitors.

### Pokerbase
- Hand recorder captures "notable hands" during live sessions, replay + share via link/social feed.
- Distinctives: staking marketplace, live rail for stakers, receipt scanner, PDF tax exports, multi-currency, tournament calendar. Hand entry is not the focus; the moat is social/staking.

### Poker Income / RunGood / Share My Pair (the graveyard)
- **Poker Income Ultimate**: once the leader, logged per-session opponent stats (VPIP, C-bet, check-raise, AF), player profiles with photos. **Not updated since 2018**; dead support.
- **RunGood**: beloved 2+2-era tracker (goals, deep filters, spreadsheet export) — abandoned, gone from the store.
- **Share My Pair**: the reference hand-replayer/sharing app (Hellmuth, Little, Raymer ambassadors; 38k hands, 4.2M video views) — **dead by 2026**. Proof of demand for live-hand sharing, and proof that replay-sharing alone didn't sustain a business.
- **Takeaway:** the category churns; long-lived winners are the ones with durable session/bankroll cores plus continuous updates.

### The new "fast hand entry" wave (2024–2026) — the key gap validators
- **HandRecorder** — "log poker hands in under 3 seconds." **Radial seat picker for 2–10 handed tables**; "smart, context-aware action tiles" that adapt (e.g., "Open vs Bet"; "Limp vs Call," "3-Bet vs Raise"); records **all actions for one position at a time, then auto-calculates the perfect sequence**; voice and chip-preset bet entry; long-press mid-hand correction without restarting. PokerStars export. Offline-first, encrypted, iCloud sync.
- **Live Solver** — tap-through streets on a visual table showing positions, stacks, and current pot at a glance; auto-saves drafts mid-hand; captures positions, stacks, bets, pot, rake, outcome; **PokerStars-format export + desktop connector** for GTO Wizard/solver pipeline.
- **Pokerscope** — dual-mode: manual table entry **or a shorthand parser**: type `Hero BU KK open 15, SB 3b 50, flop A72r` and it builds a full structured hand, handling multiway pots and complex all-ins. Captures seats, button, **straddles**, stacks, hole cards, per-street action, showdown; review screen before saving. Filters by position, preflop action, straddle, pot size, all-in. PokerNow import, PokerStars export, player profiles, equity tools, GTO drills. Free, no ads, 5.0 stars.
- **Fastroll** — hand database for live pros; filter by positions, betting lines, pot types; text export to study groups or Crush Live Call-ins.
- **GrindStack** — custom shorthand keyboard + player-tells database + LLM "AI Poker Coach" that analyzes logged hands for leaks.
- **HH Keyboard** — a custom iOS keyboard of poker terms so you can type shorthand faster into Notes. Its forum popularity shows how many players still just use the Notes app.

### Desktop trackers (PT4 / HM3 / DriveHUD) — concepts that translate
They only auto-import online hand histories, but define expectations: VPIP, PFR, 3-bet%, AF, WTSD%, c-bet stats; positional win rates; BB/100 with std deviation; filterable hand grids; per-street reports; hand replayer. A live app cannot reach those sample sizes (live ≈ 25–30 hands/hr), so the translating concepts are: positional profit breakdowns, line-based filtering ("show me all my 3-bet pots OOP"), variance context, and PokerStars-format export as lingua franca into GTO Wizard/solvers.

### PokerCruncher
$12.99 one-time, no subscription. Relevance: (1) live players happily pay one-time prices for tools; (2) an in-app "check equity at decision point X" against a recorded hand is a natural feature (Pokerscope already shows equity at key decision points).

---

## (c) Feature Gaps / Opportunities

1. **Nobody has nailed sub-10-second structured entry — the field is open.** A Poker Chip Forum user described the current best option as "**the best among the worst**." The incumbents bolt entry onto replayers; the fast-entry specialists (HandRecorder, Live Solver, Pokerscope, Fastroll) are all tiny (<20 ratings each), young, iOS-native, and none is a mobile **web** app.
2. **Smart defaults are the real speed lever.** 80% of hand context repeats within a session (stakes, blinds, table size, hero seat relative to button, stack, most players fold). Winning ideas seen: context-aware action buttons; auto-completing the fold chain ("folds to me"); recording one position's actions and auto-sequencing; drafting/auto-save mid-hand; mid-hand correction without restart; chip-preset bet sizes.
3. **Shorthand/NL text as an alternate input** is validated twice (Pokerscope parser, Left Pocket AI voice/text). Players already write `me open 15 off 800eff MP calls` in Notes. A hybrid (tap UI + parser + voice) is unclaimed.
4. **Capture-after-the-fact is the actual workflow.** Consensus on 2+2/PCF: players record **1–5 significant hands per session, after the hand ends**, not during. Design for reconstruction-from-recent-memory: start from hero's cards and position, tolerate unknown villain stacks/cards (`??`), everything optional except the spine.
5. **Live-game exotica is poorly served.** Only PBT and Pokerscope handle **straddles** properly; PBT alone does bomb pots/double boards/run-it-twice. Straddles must be first-class: they reorder preflop action and change effective stacks in BB terms.
6. **Etiquette-driven design is unaddressed.** Forum users want entry that "looks like texting your wife" (Red Chip). Opportunity: discreet mode — small, low-contrast, one-thumb UI; voice memo capture for the walk to the bathroom.
7. **The session-tracker → hand-record link is weak everywhere except PA7/Pokerscope.** Hands should inherit session context with zero re-entry.
8. **Solver/coach export pipeline is the emerging must-have:** PokerStars-format text export (for GTO Wizard), shareable replay links (study groups/Discord), LLM review. A web app can generate share links natively.
9. **Trust/durability is a real selling point.** The category's graveyard makes users wary of data lock-in. Offline-first + text export + no-account usage directly answer the top adoption objection.
10. **Pricing norms:** free tier with genuinely usable hand logging, ~$20–30/yr pro, one-time/lifetime appreciated. No ads — ads are the #1 stated churn reason from PBT.

---

## (d) Must-Have Data Model for a Live Cash Hand

Grounded in the **PHH open spec** (arXiv 2312.11753 / phh.readthedocs.io) plus live-forum conventions (Red Chip template: `1/2 NL – Venetian, $250 eff, I open KK from MP to 10, CO (LAG) calls...`).

**Game/session context (inheritable from session, editable per hand):**
- `variant` (NLHE first; PLO etc. later; bomb-pot/double-board flag; run-it-twice count)
- `stakes/blinds`: SB, BB, plus ante/BB-ante — common live structures: 1/2, 1/3, 2/5, 5/10, 1/2/5, 2/3/5; support asymmetric and 3-blind structures
- **`straddles`**: amount + type + seat — UTG straddle (default 2×BB), Mississippi/button straddle, double/re-straddle, sleeper. PHH models this as one `blinds_or_straddles` array indexed by seat: a $1/$3 game with $6 UTG straddle = `[1, 3, 6, 0, ...]`. Straddles reorder preflop action — the model must **derive** action order, not hardcode it
- `currency`, `venue/location`, `table_size` (2–10), `time/date`, `rake model` (optional)

**Players/positions:**
- `hero_position` — canonical names by table size: 9/10-handed: UTG, UTG+1, UTG+2, (UTG+3), LJ/MP, HJ, CO, BTN, SB, BB; 6-max: UTG/LJ, HJ, CO, BTN, SB, BB; heads-up: BTN/SB vs BB
- `starting_stacks` per involved player (allow unknown for irrelevant players). **Effective stack** for hero vs. main villain is the single number forums insist on ("$250 eff") — compute it, display it, allow direct entry of it as a shortcut
- Villain descriptors: optional per-player tag/read ("LAG," "station") and link to a persistent player-notes profile

**The hand itself:**
- `hero_cards` (PHH card notation `Ah`, `Td`, `??` for unknown)
- `board` per street (flop/turn/river)
- `actions` — ordered per-street list: actor (position), verb (fold / check / call / bet / raise-to / all-in), **amount ("raise to" semantics, not "raise by")**. PHH's compact verb set as internal model: `f`, `cc`, `cbr`, `sm`, `d db`. Omitted folds inferable ("folds to HJ")
- Showdown: villain cards if seen (`??` if mucked unseen), winner, **pot size** (auto-computed but manually overridable)
- `result` for hero ($ won/lost — should reconcile with, but not require, exact action math)

**Metadata:**
- `notes` (free text — "why I'm logging this"), `tags` ("3-bet pot," "bluff-catch," "cooler," "review-with-coach"), `favorite/starred`, session link, share link, PokerStars-text export

**Stats this unlocks:** $/hr and **BB/hr** (live convention; BB/100 secondary since hands aren't exhaustively logged), win rate by stake/venue/day/time, % sessions won, std dev; from logged hands: positional P/L, VPIP/PFR/3-bet for hero, results by line. Caveat to embrace honestly: hand-derived stats are selection-biased (players log big/interesting hands) — frame hand stats as *study material*; session data is the win-rate truth.

---

## (e) Key User Complaints to Avoid

1. **Tedious/slow entry** — the universal killer. If entry takes longer than a hand of poker, it dies; the fallback is always the Notes app.
2. **Ads** (PBT's #1 complaint).
3. **Aggressive paywalling of the core loop** — PA7's 1-hand-record/month free tier is resented.
4. **Abandonment fear** — RunGood/Share My Pair/Poker Income history makes export, offline-first local storage, and no-account usage genuine selling points.
5. **Rigid data entry** — 1-star reviews exist solely because a session date couldn't be edited after the fact. Everything must be editable retroactively; hands enterable hours later; unknown values allowed everywhere.
6. **Forced completeness** — apps that require full stacks/all players/exact amounts before saving lose to Notes. Auto-draft mid-hand and mid-hand correction without restart exist because early versions punished mistakes.
7. **Calculation bugs destroy trust instantly** — Pokerscope's one negative review was a pot-accounting bug. Pot math must be bulletproof, including split pots, side pots, and rake.
8. **Conspicuousness at the table** — discreet UI is a feature.
9. **Steep learning curve on reporting** — default reports should answer "am I winning, where, and at what rate" with zero configuration.
10. **Platform gaps** — a mobile web app sidesteps iOS-version floors but must feel native-fast and work offline.

**Bottom line:** the market has mature session/bankroll trackers (PBT, Poker Analytics, Pokerbase, Left Pocket) and a brand-new, unconsolidated wave of live hand recorders (Pokerscope, HandRecorder, Live Solver, Fastroll — all <20 ratings). Nobody yet combines: sub-10-second discreet structured entry with smart defaults + shorthand/voice fallback, first-class straddle support, session-context inheritance, bulletproof pot math, PokerStars-format + shareable-link export, and honest live-appropriate stats ($/hr, BB/hr) — on the mobile web with no install. That is the gap.

## Sources

[Poker Bankroll Tracker](https://pokerbankrolltracker.net/) · [Poker Analytics](https://www.poker-analytics.net/) · [Left Pocket](https://apps.apple.com/us/app/left-pocket-poker-tracker/id1601858981) · [Pokerbase](https://pokerbase.app/) · [Poker Income Ultimate](https://apps.apple.com/us/app/poker-income-ultimate/id317786797) · [RunGood 2+2 thread](https://forumserver.twoplustwo.com/170/live-no-limit-holdem-cash/anyone-still-use-rungood-live-poker-tracker-app-still-works-ios-16-17-a-1839072/) · [ShareMyPair review](https://cardmates.co.uk/sharemypair_review) · [Pokerscope](https://pokerscope.com/features/hand-recording) · [HandRecorder](https://apps.apple.com/app/handrecorder/id6751004127) · [Live Solver](https://apps.apple.com/dk/app/live-solver/id6760947103) · [GrindStack](https://apps.apple.com/us/app/grindstack-live-poker-notes/id6744820078) · [Fastroll](https://fastrollpoker.com/) · [2+2: tools to record live hands](https://forumserver.twoplustwo.com/170/live-no-limit-holdem-cash/what-tools-apps-do-you-use-record-hand-histories-when-playing-live-1846215/) · [PCF: best way to record hands](https://www.pokerchipforum.com/threads/best-way-to-record-hands-live-poker.125927/) · [Red Chip: writing live hand histories](https://redchippoker.com/writing-and-saving-live-hand-histories/) · [PHH spec](https://phh.readthedocs.io/en/stable/intro.html) · [PokerNews top-5 trackers](https://www.pokernews.com/strategy/the-top-5-best-poker-bankroll-trackers-48862.htm) · [GTO Wizard on button straddles](https://blog.gtowizard.com/opening-strategy-when-the-button-straddles/) · [PokerCruncher](https://www.pokercruncher.com/)
