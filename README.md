# Aldina

An open-source engine for producing documents — letters, reports, decks, invoices and one-pagers —
that come out on-brand and print-grade. You bring content and a **theme**; Aldina lays out the page. Built on
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

See `ARCHITECTURE.md` for how the engine is built and the
[ChoirMark spec](https://choirmark.org) for the source format.

## Usage

```bash
npm install -g aldina
```

```bash
aldina report.cmk                       # PDF beside the source
aldina report.cmk --theme leipzig       # choose a theme
aldina report.cmk --html forme.html     # emit the forme instead
aldina resolve notes.md -o report.cmk   # loose markdown to a resolved .cmk (LLM)
aldina themes                           # list what is installed
```

The document's class comes from its front matter, not a flag. Run `aldina <source.cmk> -h` for the
full set of make options.

Requires a headless **Chromium** on the `PATH` (or set `CHROMIUM`) for the gate and PDF projection.

## As a service

`aldina serve` exposes the same pipeline over HTTP, so a renderer can sit behind your own API:

```bash
aldina serve --port 4010
aldina serve --socket /run/aldina/render.sock
```

`POST /render` with `{ source, theme, from }` returns the gate verdict, the findings, and the PDF
when the page is admitted. A refused page returns the reasons and no PDF, because output that has not
passed the gate is not output. `GET /health` reports the theme allowlist and current load.

The `Dockerfile` in this repo builds a self-contained image (Node, Chromium, the themes) running
exactly that.

## Themes

Themes live in `themes/`. A theme is tokens + a per-class grammar that targets ChoirMark roles
(`[data-role]`) — Zen Garden at the role layer. A new role or class is a ChoirMark spec change, never
a theme feature; that's what keeps the interface stable.

Four of them are showcase themes, each covering all five classes with its own typographic register:
`leipzig` (authority), `ulm` (systematic), `siena` (humanist) and `parma` (editorial). `basel` is the
plain reference implementation. See `THEME-AUTHORING.md` to write your own; the gate is the contract.

## License

Dual-licensed: **AGPL-3.0-or-later** for the engine and base themes, with a **commercial license**
available for uses the AGPL doesn't fit. See `LICENSING.md`; contributions are governed by `CLA.md`.

[aldina.io](https://aldina.io) · [choirmark.org](https://choirmark.org)
