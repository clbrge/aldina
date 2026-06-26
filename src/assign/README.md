# Role-assigner

ChoirMark (`.cmk`) → **role-tagged HTML** (the resolved document). The front half of the pipeline:

```
loose markdown ──[assign.js]──▶ role-tagged HTML ──[layout]──▶ forme ──[harness]──▶ admitted
```

One file, one language (Node), no deps. Implements the hint-vs-contract gradient from the
[ChoirMark spec](https://choirmark.org):

| input | how the role is assigned | confidence |
|-------|--------------------------|------------|
| explicit `::: role` / `[x]{.role}` | the contract — used as-is | high |
| structural construct (list/code/quote/heading) | per-class map | high |
| plain block with a **marker** (date / `RE:` / `Dear` / `Sincerely,` / `Enc.:`) | pattern | high |
| plain block by **position** (address → sender/recipient, signature) | heuristic | **med → review (LLM)** |
| ambiguous plain block in the envelope | default `body-paragraph` | **low → review** |

Roles are validated against `roles/<class>.yaml`; an **unknown explicit role is an error**, never a
silently-dropped annotation (no silent fallback).

## Run

```bash
node src/assign/assign.js <source.md> [--class letter]          # assignment summary
node src/assign/assign.js <source.md> [--class letter] --emit   # the role-tagged HTML
```

## What it shows

On letters, markers + structure cover the high-confidence majority; the **only** residual flagged
for the LLM is the address/signature disambiguation (sender vs recipient) — exactly where context
helps. It does not invent roles: "To Whom It May Concern" yields no `recipient-block`.

## Scope / next

- Letter-focused classifier; deck/folio add their structural maps (headings → slide-title /
  section·chapter·part; tables, figures, code, footnotes) and relational markup.
- The `→ review` blocks are the LLM's job: confirm/correct medium-confidence roles, then freeze into
  resolved ChoirMark (a corrected tag is a post-mark on the role).
- The emitted role-tagged HTML feeds layout (`+ grammar CSS targeting [data-role]`).
