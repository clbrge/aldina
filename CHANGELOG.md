# Changelog

All notable changes to Aldina are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Versioning: [SemVer](https://semver.org/).

## [0.2.1] — Fix pagedjs resolution when installed as a dependency

### Fixed
- The gate located pagedjs at a path relative to Aldina's own directory, which only exists when Aldina
  is the root package. Installed from npm the polyfill is hoisted above it, so loading `src/run.js`
  threw `ENOENT … node_modules/aldina/node_modules/pagedjs/dist/paged.polyfill.js` and 0.2.0 was
  unusable as a dependency. The package root is now found through Node's own resolver, which holds
  whether pagedjs sits beside Aldina or above it.

## [0.2.0] — The working engine

### Added
- The **CLI** (`aldina`), verbless-primary: `aldina <source.cmk> [dest]` makes a document, `aldina
  resolve <loose.md>` writes a resolved `.cmk`, `aldina themes` lists what is installed, `aldina serve`
  runs the render service. Theme search path via `--theme-dir` / `ALDINA_THEME_DIR` / config `themeDirs`.
- `run()` and `resolveDoc()` (`src/run.js`) — the programmatic entry points the hosted API calls
  directly, never through the CLI.
- All five document classes end to end — **letter · folio · deck · ledger · brief** — plus `composed`,
  which renders each segment as its own forme at its class's paper size and concatenates the PDFs.
- **The gate** (`src/harness/`): a network-blocked headless-Chromium render (`data:`/`about:`/`blob:`
  only) and the checks that admit a page — *fit*, *contrast* (WCAG AA against the rendered background),
  *min-font*, *window-fit*, *reconcile*, *complete*, *reference* (no unresolved cross-reference) and
  *resource* (nothing fetched from the network, so a theme that is not self-contained is refused).
  Paginated formes are measured page by page.
- **Ledger arithmetic** (`src/ledger/`) — line items, totals, tax and edition-specific money handling;
  the totals identity is enforced by the gate's reconcile check, not by the theme.
- **Cross-reference and citation resolution** (`src/xref.js`) — ChoirMark emits unresolved anchors, the
  engine numbers them and writes the link text.
- **Role assignment** (`src/assign/`) — loose markdown to a resolved model by marker and position, with
  the residual escalated to the LLM checkpoint.
- **The LLM resolver** (`src/cli/resolver.js`) on mohdel: class inference, deck slide-breaking, residual
  role assignment. The one place an API call happens; `--no-llm` keeps the path fully deterministic.
- **Themes** — `basel` (the reference implementation, all five classes), `oxford`, `studio`, and the
  showcase suite `leipzig` · `ulm` · `siena` · `parma`, each spanning all five classes with its own
  spatial signature and typefaces embedded as `data:` woff2.
- **Class variants** — a `<class>-<variant>.css` overlay loaded on top of the base grammar
  (`letter-continuation`, `folio-article` / `folio-report`, `ledger-statement`, `brief-resume`).
- `scripts/embed-font.js` (+ `make embed-font`) — copy woff2 cuts into a theme and base64-embed them as
  `@font-face`, so a theme renders under the network-blocked gate.
- **`aldina serve`** (`src/serve.js`) — the pipeline over HTTP, on a port or a unix socket. `POST
  /render` returns the verdict, the findings and the PDF, and returns the findings alone when the gate
  refuses the page. Bounded by a theme allowlist, a source-size cap and a concurrency limit.
- A `Dockerfile` building a self-contained image (Node, Chromium, the themes) that runs `aldina serve`.
- `npm run conformance` — every canary fixture against every theme that declares its class, as a matrix.
- `ARCHITECTURE.md` and `THEME-AUTHORING.md` (the theme contract), plus fixture corpora for every class.

### Changed
- The output driver moved from `src/aldina.js` to `src/run.js`, and `compose.js` now emits the layout
  containers the theme targets (`article.page`, `article.report`/`.statement`/`.letter`, `.doc-head`)
  alongside document-level hooks on `<html>` (`data-min-font`, `data-paged`, `lang`, `dir`).
- Deck slides follow ChoirMark 0.2.0: a slide is an explicit `:::slide` container, and the resolver asks
  the model for bare slides — a theme derives the common compositions from what a slide holds and
  reserves `data-slide-type` for a variation the content cannot imply.
- `choirmark` and `mohdel` are consumed as published packages (`^0.2.0`, `^0.121.1`) rather than as
  local paths, so the dependency set resolves anywhere the registry does.

### Removed
- The YAML constraint and role declarations (`src/constraints/*.yaml`, `src/roles/letter.yaml`) and the
  built-in `src/grammar/letter.css`. A document's roles come from ChoirMark's vocabularies, layout is
  the theme's CSS, and what is admissible is the gate's code.

## [0.1.0] — Initial public package

### Added
- Initial repository scaffold: the output-flow driver (`src/aldina.js`), `src/compose.js`, role
  assignment (`src/assign/`), the gate harness (`src/harness/validate.js`), base roles/grammar/constraints,
  and the `oxford` base theme. See `PIPELINE.md` for the two flows and `LICENSING.md` for the
  dual-license terms.
- npm publishing flow: `publishConfig` with provenance, `release-it` config (CHANGELOG-gated
  bump, tag, GitHub Release), and GitHub Actions for lint/test and OIDC trusted publishing.
