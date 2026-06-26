# Aldina

An open-source engine for producing documents — letters, reports, and decks — that come out on-brand
and print-grade. You bring content and a **theme**; Aldina lays out the page. Built on
[ChoirMark](https://choirmark.org), an open document format.

## How it works

Aldina takes a **resolved** ChoirMark document (roles assigned) and runs a fixed pipeline:

```
ChoirMark → compose (into a theme grammar) → gate (admit / reject) → project (PDF)
```

Layout is deterministic wherever it can be, with bounded LLM checkpoints (role inference, deck
routing, repair) reserved for the steps that genuinely need judgment. The **gate** is the heart of it:
it admits only pages that pass hard checks — fit, contrast, hierarchy — so a page that doesn't measure
up is rejected rather than shipped.

See `PIPELINE.md` for the two flows (make-the-grammar vs. make-the-document) and the
[ChoirMark spec](https://choirmark.org) for the source format.

## Usage

```bash
node src/aldina.js <source.cmk> --class letter --theme oxford --out forme.html --pdf out.pdf
```

Requires a headless **Chromium** on the `PATH` (or set `CHROMIUM`) for the gate and PDF projection.

## Themes

Base themes live in `themes/` (e.g. `oxford`). A theme is tokens + a per-class grammar that targets
ChoirMark roles (`[data-role]`) — Zen Garden at the role layer. A new role or class is a ChoirMark
spec change, never a theme feature; that's what keeps the interface stable.

## License

Dual-licensed: **AGPL-3.0-or-later** for the engine and base themes, with a **commercial license**
available for uses the AGPL doesn't fit. See `LICENSING.md`; contributions are governed by `CLA.md`.

[aldina.io](https://aldina.io) · [choirmark.org](https://choirmark.org)
