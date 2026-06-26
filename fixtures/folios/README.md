# Folio fixtures (English)

The **folio** class — the third exploration bracket: structured, bound, paginated **long-form
reading documents**. (Named for the printing sense — a leaf / a bound volume — consistent with the
forme / chase lexicon. "Codex" was the runner-up: the codex form historically *invented*
this class's primitives — pagination, page numbers, TOC, index, cross-references.)

A folio sits between letter (short flow) and deck (fixed spatial), and earns its slot by
introducing three primitives *neither* bracket has: **floats · generated/derived content · deep
hierarchy**.

`article`, `report`, and `book` are the SAME class at different constraint settings (an axis, not
separate classes):

| variant | hierarchy | matter | sided | TOC |
|---|---|---|---|---|
| article (`01`) | section > subsection | none | one | optional |
| report (`02`) | chapter > section > subsection | none | one | yes |
| book (`03`) | part > chapter > section | front + back | two | yes |

## Convention (extends letters/decks)

- **Front-matter now carries title-page fields** (`title`, `authors`, `date`) — a small evolution:
  folios have a structured title page (like the letter's structured envelope), so these are
  metadata, not pure annotation. Plus the usual fixture annotation.
- **Body = loose markdown**, with relational markup the system resolves:
  - **labeled floats:** `![caption](img:x){#fig:x}` / tables `: caption {#tbl:x}`
  - **cross-references:** `[@fig:x]`, `[@tbl:x]`, `[@sec:x]`, `[@ch:x]` → the system generates the
    number ("Figure 2", "§1.1", "Chapter 3") and resolves the link. Numbers are NEVER hand-written.
  - **citations:** `[@key]` → generated, numbered, with a generated bibliography (`::: {#refs} :::`)
  - **footnotes:** `text[^id]` + `[^id]: …`
  - **generated structure:** TOC (`toc: true`), index, bibliography, section numbering — all derived.

## Index

| # | file | variant | exercises |
|---|------|---------|-----------|
| 01 | research-paper | article | abstract; figure + table floats; cross-refs; citations + generated bib; generated numbering |
| 02 | technical-report | report | chapters; generated TOC; multiple floats; **cross-chapter refs**; deep hierarchy |
| 03 | book-excerpt | book | parts; front/back matter; footnotes; generated index; two-sided |

## Emerging folio roles

heading (levels: part · chapter · section · subsection) · abstract · figure · table · caption ·
footnote · cross-reference · citation · bibliography-entry · toc-entry · index-entry ·
title-page (title/authors/date) · running-head · part-divider · body-paragraph (shared) · list (shared)

## The watch — generic vs letter & deck

**Shared (the cross-class core holds):** ChoirMark → roles → constraints → forme; markdown-hint floor;
tokens; body-paragraph, list, table, caption, footnote (rich-content roles decks already surfaced).

**Folio-new — and qualitatively different from anything before:**
- **Floats** — a THIRD placement mode. Not letter's pure flow, not deck's absolute zones: content
  that flows but the layout *relocates* (a figure near its reference, to the top/bottom of a page).
- **Generated / derived content** — TOC, index, bibliography, section/figure numbers, cross-ref
  resolution. Content *computed from the document*, not authored. Letter and deck are entirely
  self-contained; this is brand-new.
- **Deep hierarchy + long-scale pagination** — part→chapter→section→subsection, numbering, running
  heads that vary by chapter, front/main/back matter.

**The big consequence — a new VALIDATOR family: RELATIONAL checks.** Every harness check today is
*local* (does this zone overflow, is this text legible). Folios need *relational* checks that span
the whole document:
- **cross-ref resolution** — every `[@…]` resolves to a real target (no dangling refs)
- **float-near-reference** — a figure isn't stranded chapters away from where it's cited
- **numbering / TOC consistency** — generated numbers and TOC match the actual structure
- **heading hierarchy** — no skipped levels (no subsection without a section)

This is the dimension letter+deck couldn't reveal: correctness *between* parts, not just *within* a
zone. It reshapes the harness (a relational pass over the resolved document) and confirms why three
brackets were worth it — two would have left the schema untested on derived/relational content.

## Open questions (do NOT decide yet)

1. **Markdown heading → document level mapping.** `#` = title? part? chapter? section? (Pandoc's
   `top-level-division` problem.) The variant axis (article/report/book) changes the answer.
2. **Where generated content is authored vs derived.** The author writes labels + references +
   citations; the system derives numbers, TOC, index, bibliography. Drawing that line is the core
   folio-class design task — and the cleanest example yet of "judgment/derivation at the right place."
3. **Floats as a placement mode** — does the zone primitive extend to "relocatable anchored zones",
   or is float placement its own mechanism?
