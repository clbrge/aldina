# Role-assigner

Loose markdown → a **resolved ChoirMark model**. The front half of the pipeline:

```
loose markdown ──[assign.js]──▶ resolved .cmk ──[choirmark]──▶ pivot ──[layout]──▶ forme ──[harness]──▶ admitted
```

Parses with ChoirMark's `parse()` (mdast), then implements the hint-vs-contract gradient from the
[ChoirMark spec](https://choirmark.org):

| input | how the role is assigned | confidence |
|-------|--------------------------|------------|
| explicit `:::role` block directive | the contract — used as-is | high |
| plain block with a **marker** (date / `RE:` / `Dear` / `Sincerely,` / `Enc.:`) | pattern | high |
| plain block by **position** (address → sender/recipient, signature) | heuristic | **med → review (LLM)** |
| structural content (list / code / quote / prose) | no role — native markdown | high |

Roles are validated against ChoirMark's `vocabularies[class]` (from the `choirmark` package); an
**unknown explicit role is an error**, never a silently-dropped annotation (no silent fallback).
Structural content carries no role: it passes through as native markdown, which ChoirMark renders to
the corresponding element (`<ul>`, `<pre>`, `<blockquote>`, `<p>`).

## Run

```bash
node src/assign/assign.js <source.md> [--class letter]          # assignment summary
node src/assign/assign.js <source.md> [--class letter] --emit   # the resolved .cmk
```

## What it shows

On letters, markers + structure cover the high-confidence majority; the **only** residual flagged
for the LLM is the address/signature disambiguation (sender vs recipient) — exactly where context
helps. It does not invent roles: "To Whom It May Concern" yields no `recipient-block`.

## Scope / next

- Letter-focused classifier; deck/folio add their structural maps (headings → slide-title /
  section·chapter·part; tables, figures, footnotes) and relational markup.
- The `→ review` blocks are the LLM's job: confirm/correct medium-confidence roles, then freeze into
  resolved ChoirMark (a corrected tag is a post-mark on the role).
- The emitted resolved `.cmk` feeds ChoirMark and then layout (a theme's grammar targeting `[data-role]`).
