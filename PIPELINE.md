# The Aldina pipelines

There are **two distinct flows.** Do not conflate them: one *makes a grammar*, the other *makes a
document*. They share a gate and a role vocabulary; everything else is separate.

```
  LAYOUT FLOW (occasional)                       OUTPUT FLOW (per document)
  constraints + roles + tokens                   ChoirMark content (`.cmk`) + a chosen grammar
        │  design layouts                               │  route this content
        ▼                                                ▼
  admitted GRAMMAR  ───────────── handoff ──────────▶  used by compose/route
  (grammar/letter.css, deck archetypes)
```

---

## 1 · Layout flow — MAKE THE GRAMMAR  (Part I)

Design the reusable layout, validated across the whole **role-space** (structural lorem, not any one
document). Runs once per class/brand; the result is reused for every document.

```
constraints + roles + tokens   (over the role-space / lorem)
  → ① design-grammar     LLM — propose candidate layouts / archetypes;  IDENTITY if a grammar is given
  → gate (the suite)     does EVERY role/shape fit, always-good — across the role-space?
  → ② repair-grammar     LLM — fix the grammar on suite findings;  IDENTITY when admitted
  → admitted GRAMMAR     (grammar/<class>.css · deck archetype set) — reusable, brand-swappable via tokens
```

Judgment = "a layout that's always-good for **all** content." Not about any specific document.

## 2 · Output flow — MAKE THE DOCUMENT  (Part II) — `src/aldina.js`

Route a specific document's content into an already-admitted grammar, validate *this* instance,
project it. Runs per document.

```
ChoirMark content (`.cmk`)  +  a chosen admitted grammar
  → assign               deterministic — patterns + structure → role-tagged model
  → ① resolve-roles      LLM — resolve flagged roles;  IDENTITY if none
  → compose              deterministic — place content into the grammar (PINNED vs FLOW)
  → ② route              LLM — per-instance judgment WITHIN the grammar: deck archetype selection /
  │                        slide-breaking, folio float placement;  IDENTITY if the grammar determines it
  → gate (the suite)     does THIS instance fit / contrast / window-fit?
  → ③ repair             LLM — repair the instance on findings;  IDENTITY when admitted
  → project              deterministic — HTML → PDF/PNG
  → the document
```

Judgment = "fit **this** content into the grammar." Not designing the grammar.

---

## Theme — the user-facing handle over the handoff

A user doesn't pick grammars and token sets; they pick a **theme**. A theme bundles the handoff into
one identity unit — `{ tokens (shared skin) + grammars[per class] + assets }` — so all of a user's
documents come out coherent. The **layout flow** *produces* a theme (its grammars, under one token
set + design intent); the **output flow** *consumes* one (`--theme oxford`). Swapping tokens within a
theme is free reskin; switching to a theme with different grammars needs a re-route. See `themes/`.
(Printing-native synonym: a press's **house style**.)

## Shared (only these)

- **The gate** (`src/harness/validate.js`). Same checks in both flows; the *subject* differs — a grammar
  tested over the role-space (flow 1) vs. an instance tested over real content (flow 2).
- **The role vocabulary** (`roles/<class>.yaml`) — the frozen interface.
- **The grammar + tokens** are the handoff, bundled as a **theme**: flow-1 output = flow-2 input.

## The fixed-checkpoint principle (applies to BOTH flows)

Each flow is a **fixed linear sequence**; its LLM checkpoints are **always present and idempotent** —
identity when there is no residual to judge. "Letters run without the LLM" = their checkpoints were
identity on this input, not a different pipeline. Judgment is *allocated* at fixed points; the work
is a property of the input, not the code. The stage always runs; whether it *calls* the LLM is a
lazy optimization.

## Status

- **Flow 2 (output)** — built deterministically end-to-end (`src/aldina.js`); letters admit + project.
  Checkpoints ①②③ are identity stubs (no API).
- **Flow 1 (layout)** — grammars are **hand-authored** today (`grammar/letter.css`; deck archetypes
  sketched in `constraints/deck.yaml`). The AI grammar-maker (design → gate-over-role-space → repair)
  is seeded by `derive/` and is not yet a driver.

## Run (flow 2)

```bash
node src/aldina.js <source.md> [--class letter] [--out forme.html] [--pdf out.pdf]
```
