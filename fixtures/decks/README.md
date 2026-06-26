# Deck fixtures (English)

ChoirMark inputs for the **deck** class — the high-judgment / low-contract / fixed-page-spatial
bracket. Purpose mirrors letters: discover the deck role vocabulary + serve as adversarial
fixtures. But decks exist to answer a different question: **what generalizes from letters, and
what is genuinely new at the judgment-heavy end of the spectrum?**

## Convention (same spine as letters, with deck-specific notes)

- **Front-matter = fixture annotation only** — `type`, `format` (aspect, e.g. 16:9 / 4:3),
  `slides` (≈ count — a soft constraint hint), `tone`, `stresses`, `lang`.
- **Body = loose markdown.** Headings, bullets, numbered steps, bold stats, blockquotes, image
  refs (`![](visual:...)` placeholders), tables.
- **Slide breaks are HINTS, not contracts.** Headings suggest slide boundaries; the AI decides
  the actual segmentation and pacing. (We did *not* hard-delimit with `---`. That stays available
  as the explicit-contract escape hatch, per the hint-vs-contract gradient.)
- **Speaker notes via `<!-- note: ... -->`** — distinct from blockquote pull-quotes.

## Index

| # | file | type | format | slides | tone | stresses |
|---|------|------|--------|--------|------|----------|
| 01 | pitch-deck | pitch-deck | 16:9 | ~11 | persuasive | title slide; big-stat heroes; pull-quote; visual; the ask |
| 02 | project-update | project-update | 16:9 | ~8 | neutral-internal | RAG status; metrics table; risk list; decisions; timeline |
| 03 | teaching-deck | teaching-deck | 4:3 | ~10 | instructional | agenda; definition; numbered steps; speaker-notes; diagram |
| 04 | keynote | keynote | 16:9 | ~14 | visionary-sparse | full-bleed visuals; one-line big statements; near-zero text; quote slides |
| 05 | sales-product | sales-deck | 16:9 | ~10 | persuasive-commercial | feature-benefit; comparison table; logo wall; pricing tiers; demo CTA |
| 06 | board-qbr | board-deck | 16:9 | ~9 | formal-governance | dense financial tables; KPI grid; footnotes; confidential mark; appendix |
| 07 | technical-talk | technical-talk | 16:9 | ~11 | technical-practical | multi-line code blocks; architecture diagrams; before/after metrics |
| 08 | case-study | case-study | 16:9 | ~9 | showcase | full-bleed imagery; before/after split; captions; outcome stats; credits |
| 09 | roadmap | roadmap | 16:9 | ~7 | planning | now/next/later columns; gantt timeline; phases; per-item status |

## Emerging deck roles (9 fixtures)

**Structure/flow:** slide (the spatial unit) · slide-title · kicker/subtitle · title-slide ·
agenda/TOC · section-divider · appendix-divider · recap/summary · the-ask/CTA · footer/page-number (chrome)

**Body content:** bullet-group · numbered-steps · big-stat/metric · **big-statement** (one-line slide) ·
pull-quote · **quote-slide** · callout/takeaway · **code-block** · **footnote** · executive-summary

**Structured data:** metrics-table · **dense-financial-table** · **comparison-table** · **KPI-grid** ·
**pricing-tiers** · **timeline/gantt** · **now-next-later** · status-indicator (RAG) · **status-tag** · milestone

**Visual:** visual/figure · **full-bleed-visual** · **architecture-diagram** · **before/after-split** ·
**image-caption** · **logo-wall** · credits

**Cross-cutting / chrome:** **confidential-marking** (doc-level banner — a zone/overlay) · **speaker-notes** (projection-conditional)

## The watch — generic vs letter-specific

**Shared (generic across both classes — the real reusable core):**
- the architecture itself: ChoirMark → roles → constraints → forme → reskin
- the markdown-as-hint floor + front-matter annotation convention
- roles: **bullet-group / list**, **pull-quote**, **callout**, **footer / page-number chrome**, **table**
- tokens (type/space/ink/brand) + the contrast validator
- the *zone* primitive (letters: window/letterhead; decks: every slide is a spatial composition of zones)

**Deck-new (the judgment end — absent in letters):**
- **slide as a fixed spatial unit** — the core difference. Letters FLOW (one stream, mechanically
  paginated); decks are a SEQUENCE OF FIXED SPATIAL UNITS, each individually composed. This is the
  projector-vs-judge axis made structural.
- **slide-breaking + pacing** — *the* deck judgment: what becomes one slide, where a section-divider
  goes, rhythm. Letters had almost no segmentation judgment; decks are mostly that.
- **big-stat / hero number**, **section-divider**, **kicker**, **title-slide**, **agenda/TOC**, **status-indicator**
- **speaker-notes = a projection-conditional role** — content present in presenter view, absent from
  the slide projection (and from the PDF-of-slides). New concept: a role whose *presence depends on the
  projection target*. (Letters only hinted at this — `--ink` differing screen-vs-print.)

**Letter-only (absent in decks):**
- salutation · closing · signature-block · enclosures · cc · window/recipient · letterhead
  (decks carry identity in the **title-slide**, not a per-page letterhead)

## What the wider set (9 fixtures) added

- **Density spectrum is enormous — bigger than letters.** Decks run from **keynote** (near-poster,
  ~zero text, one statement per slide) to **board/case-study** (near-document: dense tables,
  footnotes, appendix, captions). The same class must layout both extremes — so "content fits the
  slide" admission means something completely different at each end (a keynote slide is mostly
  *empty*; a board slide is mostly *full*). This is the strongest argument yet that deck admission
  is thin and the *judge* carries the load.
- **The generic core is bigger than letters implied.** `code-block`, `comparison-table`,
  `footnote`, `figure/caption`, `pull-quote`, `callout` are **rich-content roles** that any class
  with a rich body (the folio class) will reuse — not deck-specific. Decks revealed them
  first only because letters rarely carry them.
- **Structured-data roles are a family of their own** — `metrics-table`, `KPI-grid`, `pricing-tiers`,
  `timeline/gantt`, `now-next-later`, `comparison-table`. These are *tabular/positional* content the
  AI must lay out spatially; they're where deck layout judgment is hardest after slide-breaking.
- **`confidential-marking` is the zone primitive again** — a doc-level banner/overlay, same family as
  letter `letterhead`/watermark. Confirms the zone primitive generalizes across classes.
- **Identity lives in the title-slide**, not per-page chrome — but `footer/page-number` and
  `confidential-marking` ARE per-page, so decks have *both* a one-time identity surface and repeating chrome.

## Open questions this surfaces (do NOT decide yet)

1. **Slide-breaking — hint vs contract, and how much is judgment.** Letters proved the projector;
   this is where the *judge* gets tested. Likely the single biggest Part-I difference.
2. **`format` is an aspect ratio, not a paper size** — and the page is *fixed-viewport*, not flowing.
   The constraint tree's `page`/`flow`/`form` families won't transfer cleanly; decks need
   aspect + slide-grid + safe-area + maybe build-order families.
3. **Admission is thin, selection is thick.** Deck hard-checks ≈ "content fits the slide, safe-area
   respected, contrast"; almost everything else (hierarchy, balance, pacing) is the *soft judge*.
   This is exactly why we explored decks before building the validator harness — the harness must
   support hard-check-dominated (letters) → soft-judge-dominated (decks) as one spectrum.
4. **Projection-conditional roles** (speaker-notes) — the forme/projector model needs a notion of
   "which roles render on which projection target" (slide / presenter / handout-PDF / notes-export).
