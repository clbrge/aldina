---
type: book-excerpt
class-variant: book            # the deep end — parts + front/back matter + two-sided
title: Foundations of Document Systems
authors: H. Marsh
length: long
hierarchy: part > chapter > section
twoside: true                  # recto/verso, mirrored margins
frontmatter: [half-title, title-page, copyright, toc]
backmatter: [bibliography, index]
stresses: front/back matter; parts; footnotes; index entries (generated back-matter); book = report + matter/parts/twoside
lang: en
---

<!-- frontmatter: half-title · title page · copyright · GENERATED toc (roman-numbered pages) -->

# Part I — Pivots {.part}

# The Pivot Principle {#ch:pivot}
Every document system that ingests many formats must first answer a single question: into what
*canonical* form does everything normalize? We call this the pivot[^pivot].

[^pivot]: The term is borrowed from data integration, where a pivot schema mediates between sources.

## Why normalize at all {#sec:why}
A system that reasons over its inputs cannot reason over fifty formats at once. It reasons over the
pivot. The choice of pivot — flowable, paginated, schematic — shapes everything downstream, a theme
we return to throughout this book.

## Categories of pivot {#sec:categories}
Documents fall into a small number of *categories*, each with its own natural pivot. A flowable
document pivots to markup; a paginated one to a page model; a schematic one to structured data.

# Part II — Grammars {.part}

# Layout as Grammar {#ch:grammar}
If the pivot fixes *what* a document says, the grammar fixes *how* it is shown. The two are
deliberately separate — content holds meaning, the grammar holds judgment.

<!-- backmatter: GENERATED bibliography · GENERATED index (pivot, grammar, normalization, category, …) -->
