# Brief fixtures (English)

The **brief** class — the **designed single page**: product one-pagers, fact sheets,
résumés, flyers, sell sheets, case-study one-pagers, menus. One paper surface, composed as
a whole, that **must fit with no overflow and no pagination.**

A brief sits between deck and folio and is the easiest class to confuse with a deck, so the
boundary is the whole point: a deck is a **sequence** of fixed *aspect-ratio* surfaces for
*projection*; a brief is **one** fixed *paper* surface for *print/PDF*, set in document
typography. "A brief is a one-slide deck" is the trap — same single-surface composition, but
a different format family (paper not aspect), a different type scale (document not
projection), and a different gate (fit-to-paper, not safe-area).

> **Scope:** the `brief` class is **one surface, fit-or-fail.** If content wants to spill to
> a second page it's a `folio`, not a brief. If it's a sequence of surfaces it's a `deck`.
> The defining constraint is **everything fits one composed page** — the author brings more
> than fits and the system must compose, never paginate.

## Convention (extends letters/decks/folios)

- **Front-matter = fixture annotation only** — `type`, `format` (paper size or aspect like
  `a5-portrait`), `tone`, `stresses`, `lang`. Plus the brief-specific field:
  - **`density:`** — `sparse` / `medium` / `dense`. The brief analogue of the deck's
    keynote↔board spectrum, but compressed onto **one** page: a flyer is mostly whitespace,
    a résumé/fact-sheet is maximally packed. Same class, both extremes, one surface.
- **Body = loose markdown.** Headline, subhead/kicker, sections, bullets, bold stats, a
  spec/data table, image refs (`![](visual:...)`), a quote, a CTA/contact footer. Roles are
  **not** tagged; the engine infers them and composes the single surface.

## Index

| # | file | type | format | density | stresses |
|---|------|------|--------|---------|----------|
| 01 | product-one-pager | product-one-pager | us-letter | medium | hero + subhead; problem; 3 feature blocks; proof stat; single CTA |
| 02 | company-fact-sheet | fact-sheet | a4 | dense | dense facts; stat grid; product & leadership lists; contact footer |
| 03 | resume | resume | us-letter | dense | the **packed extreme** — max content forced onto one page |
| 04 | event-flyer | event-flyer | a5-portrait | sparse | the **empty extreme** — big type, one image, a few facts; near-poster |
| 05 | sell-sheet | sell-sheet | us-letter | medium | hero image + spec table + benefits + price + where-to-buy |
| 06 | case-study-one-pager | case-study | a4 | medium | challenge/solution/results; 3 outcome numbers; client quote |
| 07 | restaurant-menu | menu | a4 | dense | many item+desc+price rows across sections; multi-column candidate |

## Emerging brief roles

**hero / headline** · **kicker / subhead** · section-label · body-paragraph (shared) ·
feature-item · bullet-group (shared) · **big-stat / outcome-number** (shared with deck) ·
**callout / benefit** · **spec-table** (shared `table`) · price-block / item-price ·
pull-quote (shared) · figure / hero-visual (shared) · logo · **CTA** · contact-footer /
chrome · column-group

## The watch — generic vs brief-specific

**Shared (the cross-class core holds):**
- ChoirMark → roles → constraints → forme; markdown-hint floor; front-matter annotation; tokens.
- **big-stat** (from deck), **pull-quote**, **callout**, **table**, **figure/caption** — the
  rich-content roles decks/folios already surfaced reappear here, confirming the core.
- **hero + kicker** ≈ the deck **title-slide** pattern (a one-time identity surface).

**Brief-new — and the boundary cases worth naming:**
- **Single-surface fit-or-fail on *paper*.** Decks composed single surfaces too, but by
  *aspect ratio* for *projection*. Briefs do it on a *paper* page in *document* typography —
  so the constraint families are deck-like (safe-area, single composition) while the format
  family is letter/folio-like (paper size, print bleed/margins). It's the first class that
  **inherits composition from deck and format from the paper classes.**
- **Density as the core judgment, on one page.** The flyer↔résumé spread is the keynote↔board
  spread compressed: the same class must lay out near-empty and maximally-packed, so "fits
  the page" means opposite things at each end (a flyer is mostly *empty* and wants generous
  scale; a résumé is *full* and wants tight typographic economy). This is where the brief's
  soft judge carries the load — pick a type scale and column structure that *just* fits.
- **No pagination escape hatch.** Letters/folios/ledgers spill to another page when content
  grows; a brief **may not.** Overflow is a *failure*, not a layout event — the strongest
  hard-check the class has, and the one that defines it.

**Brief-only (absent elsewhere):** the no-overflow-no-pagination invariant; choosing a type
scale to *make* content fit a fixed surface (rather than paginating to absorb it).

## Open questions (do NOT decide yet)

1. **Is `brief` a distinct class or `deck` at `slides: 1` on paper?** The fixtures argue
   distinct (format family, type scale, and gate all differ), but the composition machinery
   is shared with deck — so the implementation may *reuse* the deck composer while the class,
   constraints, and theme treatment stay separate. Decide before building the composer.
2. **Overflow resolution policy.** When content can't fit: shrink type within a floor,
   tighten leading, drop to multi-column, or *reject and ask the author to cut*? The class's
   identity hinges on this answer — and on whether the gate's "fit" check is hard or soft.
3. **Multi-column as a first-class structure.** Fact sheets, menus, and dense résumés want
   columns; is column-flow a brief constraint family, or shared layout the folio also needs?
4. **Density as an explicit constraint vs an inferred property.** Is `density` a knob the
   author/theme sets, or something the engine derives from content volume and reacts to?
