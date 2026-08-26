# Aldina — architecture

Aldina is the **rendering engine**: it turns a ChoirMark document and a theme into a gated,
print-grade PDF. ChoirMark owns the **format** — the `.cmk` syntax, the document classes, the role
vocabularies, the HTML pivot (see the ChoirMark spec). Aldina owns the **engine** — resolving,
composing with a theme, the admission gate, and PDF projection. The gate is the guarantee: a document
that renders is correct for its theme, never shipped-and-broken.

## The two flows

- **Output flow** (`src/run.js`) — a resolved `.cmk` + a chosen theme → a PDF. The hot path.
- **Layout flow** (occasional) — authoring a theme's per-class CSS grammar, validated over the whole
  role-space rather than one document. The grammars are hand-authored CSS.

The output flow is reached three ways, all calling the same `run()`: the CLI, an import of
`src/run.js`, and `aldina serve` (`src/serve.js`), which puts it behind HTTP on a port or a unix
socket. One code path, so a hosted renderer and the CLI cannot disagree about what the gate admits.

## The output pipeline

```
loose .md / incomplete .cmk
  │  RESOLVE  (the one LLM step — best-effort judgment)
  ▼
resolved .cmk ──parse──▶ ChoirMark pivot ──compose──▶ forme (pivot + theme CSS)
                                                         │  gate (admit / reject)
                                                         ▼  project
                                                       a PDF
```

- **resolve** (`resolveDoc`) — the only place a model runs: infer the class if absent, break decks
  into slides, assign roles. Idempotent — identity on an already-resolved `.cmk`.
- **parse** — ChoirMark's `toHtml()` yields the role-tagged pivot (the format boundary, below).
- **compose** (`src/compose.js`) — wrap the pivot in the class's surface element and inline the
  theme's CSS. Aldina does not restructure; the theme's CSS lays out the carried `[data-role]` /
  `[data-zone]`.
- **gate** (`src/harness/validate.js`) — measure the rendered DOM; admit iff every check passes.
- **project** — `Page.printToPDF` from the gated page; `pdf-lib` pins metadata and merges segments.

Render is a **deterministic pure function** of the resolved `.cmk` (no model after resolve), so the
same input renders identically up to the pinned Chromium and fonts. The **always-good guarantee**
covers exactly this: a resolved `.cmk` rendered through a tested theme. Resolve is best-effort
judgment and is not claimed sound — its output, the resolved `.cmk`, is the reviewable, correctable
artifact.

## The pivot — the ChoirMark boundary

Aldina consumes ChoirMark's normative HTML pivot and never reaches into the parser internals (`xref`
and ledger derivation operate on the serialized HTML, not the AST). It imports from the `choirmark`
package as the single source of truth: `toHtml`, the per-class `vocabularies`, and `frontMatter`.
The pivot contract is version-pinned — ChoirMark exports `PIVOT_CONTRACT_VERSION` and Aldina refuses a
version it doesn't understand rather than mis-rendering. ChoirMark's content defenses (raw HTML
escaped to text, unsafe URL schemes dropped) hold at this border.

## Classes

ChoirMark defines the document classes (letter, folio, deck, ledger, brief) and their role
vocabularies. Aldina renders each through a per-class `compose` path and a per-class theme grammar;
some gate checks are class-conditional and fire only when their inputs are present (`window-fit` for a
letter envelope, `reconcile` for a ledger). Class is read from front matter before rendering; a loose
`.md` with no class has it inferred at resolve, and a resolved `.cmk` with no class is malformed (no
default).

## Composition — multi-segment documents

A composed document is an ordered sequence of class-segments (ChoirMark marks the boundaries). The
engine rules:

- **Class switch ⇒ forced page break; every page is single-class** — no cohabitation logic, so
  stitching is concatenating each segment's rendered pages.
- **Native geometry per segment** — each segment renders in its own paper size; segments are composed
  and gated independently (`runComposed`) and the per-segment PDFs merged (`pdf-lib`).
- **The theme persists and must span the class set used** — completeness is a gradient.
- **The promise is per-page correctness; the sequence's aesthetics are the author's.**

Page numbering is per-segment.

## The admission gate

Class-agnostic hard checks; a forme is admissible iff **every** check passes. The gate **admits or
rejects** — there is no auto-repair; recovery is a resolve-tier `.cmk` edit or a theme fix. Taste-based
*selection* (best-of-N among already-admitted candidates) is a separate layer that never gates, so
non-determinism stays out of the correctness path.

Checks:

- **fit** — content stays within its page/zone box (no overflow or clipping).
- **bounds** — no element renders entirely outside its page box (off-page absolute/fixed).
- **contrast** — WCAG AA on text vs its effective background, with the text colour **alpha-composited**
  over that background (transparency is not ignored).
- **min-font** — rendered font size ≥ the per-class floor (`data-min-font`).
- **window-fit** — recipient ink within the `--win-*` envelope zone (letter).
- **reconcile** — the ledger calc graph evaluates and every authored total matches.
- **reference** — every cross-reference / citation resolves; an unresolved `?` is a rejection.
- **resource** — a blocked **network** resource (an external `@import`/`url()`) fails the document: a
  resource that can't load means the output isn't what the theme designed.

**The static floor:** the gate measures the static render with JS off — that static form is what is
admitted and printed. JS is loose enhancement, never load-bearing.

**The harness** drives a **system Chromium over CDP** (`src/harness/chromium.js`, a dependency-free
client on Node's global WebSocket — no Puppeteer). A system Chromium is required (`CHROMIUM` or
`chromium` on `PATH`; no bundled download). The sandbox is **on by default** (`ALDINA_NO_SANDBOX=1` to
disable for a container/root deploy). Request interception permits only `data:` / `about:` / `blob:`;
every network/file fetch is aborted (and a blocked network scheme fails the `resource` check). Theme
CSS that breaks out of the inlined `<style>` block (a `</style>` sequence) is **refused by default**;
`--insecure` overrides it for an author rendering their own theme at their own risk.

## Editions — evaluating the ledger calc

The ledger class defines a closed calc language (ChoirMark); Aldina **evaluates** it. How the named
roles compose into a total is jurisdictional, expressed as an **edition** — declarative data, never
code: named outputs as expression trees over the calc ops, plus a rounding mode. Aldina ships exactly
one universal default, `PLAIN_EDITION` (`total = subtotal + discount + tax`, where `discount`/`tax`
are signed adjustment rows, so a reduction is authored negative); it ships **no jurisdictional
edition**. Editions are discovered on a search path (`--edition-dir` / `ALDINA_EDITION_DIR`) and
override the default per `edition:`; an unknown id is a loud error. `derive` fills absent totals the
edition defines, and the `reconcile` check evaluates the graph and asserts every authored total
(edition-relative — a US invoice checked under `eu-vat` should fail).

## Themes

A theme is one identity unit: `{ tokens (shared skin) + grammars[per class] + assets + ledger
editions }`. It is **CSS-only and Zen-Garden-style** — CSS targets `[data-role]` / `[data-zone]`,
never the content's position. A token swap is free reskin; a different grammar re-renders
deterministically. A theme must be **class-complete** for the documents it carries and
**direction-complete**. Themes are discovered on a search path (`--theme-dir` / `ALDINA_THEME_DIR`); a
missing class/variant CSS is a loud error. For a brief, the theme maps ChoirMark's `data-zone` slots
to layout (matching on zone name); an unmatched zone falls to the theme's declared default flow zone,
gated by `fit`, never silently dropped.

**Self-contained / offline.** Themes render in the gate's network-blocked browser: only `data:` /
`about:` / `blob:` load, so an external `@import` / `url()` is a `resource` failure. Fonts must be a
system stack or a `data:` woff2; images must be `data:` URIs.

## Direction (RTL / LTR)

The document's base direction (`dir` + `lang` on the `<article data-class>` wrapper, from front
matter) mirrors the theme **for free** when the grammar is authored in CSS logical properties
(`margin-inline`, `text-align: start/end`, `inset-inline`); physical `left`/`right` is a deliberate
exception for geometry that must *not* mirror (an envelope window). Per-block bidi isolation lives in
ChoirMark's pivot. The gate validates a page **in its declared direction**.

## Doctrine

- **Validate the output, concede the input** — the gate checks rendered pixels and evaluated numbers,
  never whether a name is in a registry.
- **Judgment placed, not avoided** — confined to resolve; the render is deterministic.
- **No silent fallbacks** — a missing edition, an unresolved reference, a blocked resource, or a
  pivot-version mismatch fails loudly rather than degrading.

## Environment

- **Node ≥ 22** (the CDP client uses the global `WebSocket`).
- **`CHROMIUM`** — path to a headless Chromium, else `chromium` on `PATH` (required; no bundled
  download).
- **`ALDINA_NO_SANDBOX=1`** — disable the Chromium sandbox (container/root only; on by default).
- **`ALDINA_THEME_DIR`** / **`--theme-dir`**, **`ALDINA_EDITION_DIR`** / **`--edition-dir`** — search
  paths for themes and ledger editions.
