# Design Craft Playbook (research digest, 2026-09-02)

Full research: what separates professionally-designed apps from the "AI-generated look", distilled to the rules PokerTrack's design system follows. Sources include Linear's design docs, Apple HIG, Refactoring UI, Emil Kowalski's animation rules, and 2024-26 designer critiques of AI-generated UI.

## AI-tells checklist (what we removed)

1. Emoji as icons → one icon set at text size (SF-Symbols-style SVGs)
2. Uniform border-radius everywhere → radius hierarchy: 6px chips, 8-10px buttons, 12px containers, 16px sheets; nested = `outer − padding` (concentric rule)
3. Everything wrapped in evenly-weighted bordered cards → flatten; group with whitespace + hairline separators; iOS inset-grouped lists
4. Uniform spacing → proximity encodes relationship: 4-8 within groups, 16-24 between, 32-48 between sections
5. Hierarchy by size only → weight + opacity + tracking at equal sizes
6. Borders + shadows together → dark mode: luminance steps only, almost no borders
7. Gradients/glows → one desaturated accent, solid colors
8. Centered-everything → left-aligned, iOS large-title convention
9. Colored accent stripe on cards → status via dots/tinted text
10. Generic empty states → "what appears here + the button that creates it"
11. Decorative motion → animate state changes only, ease-out only, no bounce
12. Default font, one weight → system SF used deliberately: weights 400/500/600, tight tracking ≥20pt, tabular numerals

## The system PokerTrack uses

**Dark ladder (Apple OLED-first — right for dim poker rooms):**
canvas `#000` → surface `#1C1C1E` → raised/pressed `#2C2C2E` → fill `#3A3A3C`; separators `rgba(84,84,88,0.5)` hairline. Lighter = closer. No box shadows.

**Ink (opacity steps of one near-white, never ad-hoc grays):**
primary `#FFF`, secondary `rgba(235,235,245,.6)`, tertiary `.3`, disabled `.16`. Long text `#F2F2F7`-class, never pure white blocks.

**Chroma budget:** accent gold `#F0B429` ONLY on primary CTA, active tab, selection. Win `#30D158` / loss `#FF453A` only on numerals + dots. Suits (♠♥♦♣ four-color) are data. Nothing else colored.

**Type scale (iOS Dynamic Type Large):** 34/700 large title (tracking −0.5), 22-20/600 titles, 17/600 headline vs 17/400 body, 15 subhead, 13 footnote, 11 caption. Money numerals: `ui-rounded` (SF Rounded) semibold + `font-variant-numeric: tabular-nums`, right-aligned in columns.

**Motion:** press 120ms `cubic-bezier(0.23,1,0.32,1)` scale(0.97) + Surface-2 fill; sheets 300ms `cubic-bezier(0.32,0.72,0,1)`; color changes 150ms; hard cap 300ms; hot path (logging actions) unanimated; `prefers-reduced-motion` respected; animate transform/opacity only.

**Chrome:** blur only under bars that content scrolls beneath: `backdrop-filter: saturate(180%) blur(20px)` over `rgba(0,0,0,0.75)`.

**Domain anchor (the Flighty lesson):** one distinctive element from the game's physical world — the poker-chip dashed ring (app icon, live-session marker) — instead of generic decoration.
