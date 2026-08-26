# Aldina — Theme Authoring Guide

A **theme** is the design half of Aldina. The content half (a resolved ChoirMark document) arrives as a
neutral, role-tagged HTML **pivot**; the theme is the CSS that turns that pivot into an on-brand,
print-grade page. The two are joined the way a CSS Zen Garden page is: the markup is fixed, the look is
entirely the stylesheet's.

This guide is the contract for that stylesheet. It is **not** a frozen specification — the engine and
its themes ship together and co-evolve. The real, executable definition of "correct" is **the gate**:

> A theme is conformant when its rendered output is **admitted** by the gate across the canary fixtures.

Run that check at any time:

```
npm run conformance        # every canary fixture × every theme that declares its class → gate
```

`themes/basel` is the reference implementation — read it alongside this guide. It covers all five
classes and is the worked example for every rule below.

## Themes are self-contained — no network

The gate (and the PDF projection) render in a **network-blocked** browser: only `data:`, `about:`,
and `blob:` URLs load. A theme that fetches a **network** resource — a Google-Fonts `@import`, a CDN
stylesheet, a remote image — is **rejected** by the gate: a resource that doesn't load means the
output isn't what the theme designed, which would break the always-good guarantee. So a theme must
be self-contained:

- **Fonts** — use a system-font stack (as `basel`/`oxford` do), or embed the face as a `data:` URI
  in `@font-face { src: url(data:font/woff2;base64,…) }`. An external `@import` is rejected.
- **Images** — inline them as `data:` URIs. (Resolving an `assets/` path is not built yet.)

---

## 1. What a theme is made of

A theme is a directory on the theme search path (a built-in `themes/<name>`, or any dir passed via
`--theme-dir` / `ALDINA_THEME_DIR` / config `themeDirs`). It contains:

| file | role |
|---|---|
| `theme.yaml` | the manifest — `name`, `description`, and the **`classes`** it covers |
| `tokens.css` | design tokens (custom properties) — loaded for **every** class |
| `<class>.css` | the grammar for a class (`letter.css`, `deck.css`, `folio.css`, `brief.css`, `ledger.css`) |
| `<class>-<variant>.css` | a variant overlay, loaded on top of the base for that variant (see §3) |
| `assets/…` | optional logo / letterhead images the grammar references |

`theme.yaml`:

```yaml
name: basel
description: Swiss/International — systematic sans, grid, restrained.
classes: [letter, deck, folio, brief, ledger]
tokens: tokens.css
grammars:
  letter: letter.css
  deck: deck.css
  folio: folio.css
  brief: brief.css
  ledger: ledger.css
assets: {}
```

`classes` is what `aldina themes` lists and what the conformance run uses to decide which fixtures apply.
The engine loads files **by convention** (the names in the table), not by reading `grammars` — keep the
file names exactly as above.

---

## 2. The pivot — what your CSS targets

The pivot is two kinds of hook: **semantic roles** (ChoirMark's, stable and specified) and **layout
containers** (Aldina's, emitted by `compose`).

### Roles (from ChoirMark — see its spec)

- `[data-role="<role>"]` — a semantic block HTML has no element for (`date`, `subject`, `issuer-block`,
  `hero`, `price`, …). The role set per class is ChoirMark's frozen vocabulary; style each one.
- `[data-zone="<name>"]` — a brief's **zone**: a `<section data-zone>` grouping the blocks of one named
  slot (ChoirMark's `:::zone{name=…}` container). The name is **loose** (not an enum); a brief theme is a
  **zone map** placing each zone name into a grid slot.
- `[data-slide-type="<type>"]` — a deck's **slide**: each `<section>` is one slide (the whole 1280×720
  surface). A slide is usually a **bare `<section>`** — `type` is a rare, conscious variation, not the
  norm (see "Deck compositions" at the end of this section). When present it is a **loose** name (not an
  enum). Style `section` for the frame, derive the common compositions from content, and add
  `section[data-slide-type="<type>"]` only for a genuine variation.
- `[data-title="<title>"]` — a slide's explicitly-set title (ChoirMark's `:::slide{title=…}`). Usually
  absent: the slide's title is otherwise its most-prominent heading, derived downstream. It feeds the
  outline/nav, not layout — you rarely style it.
- `dir="auto|ltr|rtl"` — present on every role block (`auto`), forced `ltr` on code. Don't fight it.
- `data-class="<class>"` — on each `<section>` of a composed segment (see §6).

Native Markdown (headings, lists, tables, blockquotes, code, images) arrives as **native HTML** with no
role — style it by element (and by container, e.g. `.report > h2`). A role is only ever for meaning the
element lacks.

### Containers (from Aldina's `compose`)

| container | where |
|---|---|
| `article.page` | the single-page surface (default letter, brief, single-page folio/ledger) |
| `article.report` / `article.statement` / `article.letter` | the flowing multipage variants |
| `.doc-head` | folio title block (emitted when `meta.title` is present) |

Document-level hooks on `<html>`:

- `data-min-font="<px>"` — the minimum font-size floor for this document (the gate reads it; default 12).
- `data-paged` — present when the forme is multipage (the gate paginates it before measuring).
- `lang` / `dir` — the document's base language and direction.

---

### Deck compositions — derive, don't enumerate

A deck theme should **not** put a `type` on every slide. Most slides are bare `<section>`s and the theme
**derives** their composition from what they hold, with `:has()`; `type` is reserved for a variation the
content can't imply. Organise `deck.css` in three cascade layers so the derivation and an explicit type
never fight:

```css
@layer base, defaults, variations;

@layer base {        /* slide frame, typography, role styling — always applies */
  section { display: flex; flex-direction: column; justify-content: flex-start; /* … */ }
  section h1 { /* … */ }  section [data-role="stat"] { /* … */ }
}
@layer defaults {    /* common compositions, derived from content */
  section:not(:has(ul, ol, table, p ~ p)) { justify-content: safe center; align-items: center; text-align: center; }
  section:not(:has(ul, ol, table, p ~ p)):has(h1) h1 { font-size: 80px; }              /* a lone headline reads large */
  section:not(:has(h1)):has([data-role="callout"]) [data-role="callout"] { /* a bare callout is a quote */ }
}
@layer variations {  /* explicit, conscious data-slide-type — wins by layer order */
  section[data-slide-type="agenda"] { /* a numbered agenda: content can't imply it */ }
}
```

The rule of thumb: a **sparse** slide — no list, table, or multi-paragraph body — is a *focal* slide, so
centre it. That one `:not(:has(…))` selector covers cover, statement, stat, and quote at once, and you
layer per-treatment tweaks on top (a lone headline enlarges; a headingless callout becomes a big
borderless quote). A slide with a list, table, or prose body is *content* — leave it top-left (the base
default).

`type` earns its place only when a slide's layout is genuinely **not** derivable — a numbered `agenda`, a
3-up `feature` grid, an oversized `pullquote`. Put those in `@layer variations` so they beat the
derivation by **layer order**, not by fragile selector specificity. Keep the base layered too: unlayered
rules beat *all* layers, which would let the base out-rank the derivation. `basel/deck.css` ships exactly
this shape.


## 3. Covering a class means covering its variants

A class is not one layout. Several classes have a **variant overlay** loaded on top of the base grammar,
selected by the document's `class-variant` (or, for ledger, the paged form):

| class | base | variant overlay (when applicable) |
|---|---|---|
| letter | `letter.css` (windowed single page) | `letter-continuation.css` (multipage, flowing) |
| folio | `folio.css` (shared roles/floats) | `folio-article.css` **or** `folio-report.css` (each owns the one `@page`) |
| ledger | `ledger.css` (single page) | `ledger-statement.css` (multipage table) |

To **cover** a class, ship every file that class can load. If you declare `letter` but omit
`letter-continuation.css`, a continuation document fails to render — and the conformance run reports it.
Folio is the strict case: `folio.css` must hold the shared grammar and **must not** declare `@page`,
because each variant overlay declares its own; two `@page` rules make the paginator drop the margin
boxes.

---

## 4. The gate — the real contract

Every page (and every page of a paginated forme) must pass these checks. Author near their edges
deliberately, but never over them:

- **fit** — no container overflows its page box. Content that can't fit must wrap or break, never clip.
- **contrast** — every text run meets WCAG AA against its **actually-rendered** background: **4.5:1**
  normal text, **3:1** large text (≥24px, or ≥18.66px bold). Tint a muted grey too far and it fails.
- **min-font** — no text renders below `data-min-font` (default 12px). Fine print has a floor.
- **window-fit** — if the theme declares an envelope window (`--win-x/--win-y/--win-w/--win-h`), the
  recipient block must fall inside it.
- **reconcile** — for a ledger, the line-items column sums to the subtotal and the totals add up. This
  is content arithmetic, but a theme that hides or reorders the total breaks it.
- **complete** — for a paginated forme, a `#doc-end` sentinel must survive pagination; if an element is
  too tall to break, content drops and this fails.

When a forme is paginated, the engine adds the `#doc-end` sentinel and the gate measures each rendered
page. You don't add the sentinel — you must not break it (don't `display:none` the document body's last
element, don't wrap everything in something unbreakable).

---

## 5. Direction (RTL)

**Default to CSS logical properties** — author the grammar in them and RTL mirrors for free:

- `margin-inline` / `padding-inline` / `inset-inline`, rather than `margin-left` / `right`.
- `text-align: start | end`, rather than `left | right`.
- `border-inline-start`, logical `inset`, `float: inline-start`.

This is a default, not a prohibition. Physical `left` / `right` / `top` is a deliberate exception you may
take when the geometry genuinely must **not** mirror with text direction — placement that lives on the
paper rather than in the reading order. The standing example is an envelope window: the recipient block
sits in a fixed physical spot whatever the language, so `oxford/letter.css` positions it with physical
`left` / `top` (and says so in a comment). Take the exception when it's right, and justify it where you take it.

Render the RTL canary fixtures under `dir="rtl"` to eyeball your mirroring — that's a visual check you run,
not an automated logical-vs-physical assertion the gate makes. Per-block bidi isolation is already handled
by the pivot (`dir="auto"`); your job is to mirror by default and choose physical only on purpose.

Locale specifics that are **not** a mirror — currency formatting, tax math, numerals, date order — are
the **edition** mechanism, not direction. A segment may carry `edition=<id>`; the engine reads it.

---

## 6. Multipage and composition

**Multipage** (a long letter, report, or statement): set the variant overlay (§3), which declares
`@page { size; margin; @top-*/@bottom-* … }`. Use `string-set` to capture a running-head value from
content (`string-set: subj content()`) and `string(subj)` / `counter(page)` in the margin boxes. Keep
blocks whole with `break-inside: avoid`; suppress the running head on the first page with `@page:first`.

**Composition** (one document that switches class — letter, then report, then invoice): the document is
`class: composed`, and ChoirMark splits it into `<section data-class="…">` segments. The engine renders
**each segment as its own forme at its class's native paper size** and concatenates the PDFs, so a theme
that supports composition simply needs to **cover the class set the document uses** (§3) — there is no
special composition stylesheet. A single identity across those grammars (shared tokens, consistent type
and rule treatment) is what makes the composed document read as one piece.

---

## 7. Do / Don't

**Do**

- Put all color, type-scale, spacing, and brand decisions in `tokens.css`; let grammars consume them.
- Style by role and by element; reach for the role only when the element carries no meaning.
- Author in logical properties from the first line.
- Ship every file a declared class can load (base + variants).
- Run `npm run conformance` before calling a theme done.

**Don't**

- Don't hard-code `left`/`right` or physical margins.
- Don't declare `@page` in a shared base that a variant overlay also declares (folio).
- Don't push text under the min-font floor or contrast under AA to fit content — fix the layout instead.
- Don't hide or reorder a ledger total, or make a page's last element unbreakable.
- Don't invent markup the pivot doesn't emit; a new role or container is an engine/format change, not a
  theme one.

---

## 8. Conformance

`npm run conformance` runs every `fixtures/*/resolved-*.cmk` canary through every theme whose `classes`
cover it, gates the result, and prints a matrix. A theme is done when every cell it covers is `PASS`.
Cells the theme doesn't declare show `—`; a missing variant file or a gate failure shows `ERR` / `FAIL`
with the reason. This is the executable form of this whole guide — when in doubt, run it.
