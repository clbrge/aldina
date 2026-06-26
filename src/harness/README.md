# Harness — the admission gate

The HARD checks that define the grammar **extensionally**: a forme is *admissible* iff every
check passes. Soft judgment (hierarchy, balance, pacing) is NOT here — that's the future judge.
Class-agnostic: one validator runs on letters and decks alike.

## Run

```bash
node src/harness/validate.js <forme.html>      # exit 0 = admitted, 1 = rejected, 2 = harness error
CHROMIUM=/path/to/chromium node src/harness/validate.js <forme.html>   # override the binary
```

**One file, one language.** `validate.js` is a Node script; the `measure()` function inside it is
the browser-side code — it's stringified and injected into a temp copy of the forme (formes stay
clean), chromium renders it (`--dump-dom`), and Node extracts the JSON and prints the summary.
No npm dependencies. The only external is the **chromium binary** — unavoidable, because measuring
rendered CSS needs a real layout engine; Node can't do it alone.

## Checks (v1)

| check | what | scope |
|-------|------|-------|
| `fit` | every `[data-zone]`'s content stays within its box (no overflow) | universal — the central deck gate |
| `contrast` | WCAG AA on text vs effective background (4.5, or 3.0 for large/bold) | universal |
| `min-font` | rendered font-size ≥ floor (`data-min-font` on `<html>`, default 12px) | universal |
| `window-fit` | `[data-role=recipient-block]` ⊆ the `--win-*` zone | letter — fires only when `--win-*` is present |

`window-fit` reads the window rect straight from the CSS custom properties, so the same validator
stays class-agnostic — letter-specific checks light up only when their inputs exist.

## Config

- `<html data-min-font="18">` — per-class min-font floor (decks ~18px, letters ~12px = 9pt).

## Known v1 limitations / next checks

- **Add:** `safe-area` (content within the safe inset, bleed-zones exempt), `measure` (letter line
  length 45–75ch), `keep-together` / `no-orphan` (multi-page; needs Paged.js to finish first).
- **Refine:** `contrast` ignores element `opacity` (treats white@.8 as full white); add a
  placeholder/non-content exemption; consider a per-role min-font (fine-print floor < body floor).
- **Multi-page formes** (Paged.js) need the runner to wait for pagination before measuring.
- **Baseline/allowlist** for accepted findings (so a known fine-print exception doesn't re-reject).

## Why both hand-made formes currently "reject"

The gate immediately found real drift on formes that looked fine — `--brand-accent` is borderline
for small text, and the 8pt footer contradicts `letter.yaml`'s `min-font: 9pt`. That's the point:
findings → decisions. These feed the deferred cross-class token pass.
