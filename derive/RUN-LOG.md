# Derivation run log

Each entry is one propose→gate→repair→admit loop. Generator = human stand-in for now (an LLM call
is the pluggable next step — that step costs API tokens). Gate = `src/harness/validate.js`.

## complaint-us10 · letter · us-letter · window us-10-left
Spec: `constraints/letter.yaml` + `roles/letter.yaml` + a token set + `fixtures/letters/06-complaint.md`.
Generated **fresh from the spec** (not copied from an existing forme).

| iter | verdict | window-fit | min-font | contrast | note |
|------|---------|-----------|----------|----------|------|
| 0 | REJECTED | ✓ | ✓ | ✗ | subject/RE in `--brand-accent` #3b6cff = ratio 4.40 < 4.5 |
| 1 | **ADMITTED** | ✓ | ✓ | ✓ | repair: accent → underline rule, subject text → `--ink` |

**Repair rationale fed back from the finding:** the ink-scale rule — accent *decorates*, text stays
near-neutral. So the fix wasn't "darken the blue" but "stop coloring text with the accent."
Converged in **one repair**. Rendered: clean one-page letter, recipient correctly in the window zone.

### What this run proves
- The spec (constraints + roles + tokens + fixture) is **sufficient to generate from**.
- The gate **catches a real, plausible generator mistake** (accent-on-text contrast).
- **Findings → repair converges** — the loop closes.

### What it does NOT yet prove
- That an **LLM** can do the generation unsupervised. The generator was a human stand-in; wiring a
  real LLM call (and paying for it) is the next step. The brief in `GENERATOR.md` is that prompt.
