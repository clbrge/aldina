// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Perf bench: times the render pipeline per fixture — run() gates and prints in one Chromium.
// Run: make bench-render (needs chromium). Indicative single-run wall-clock; the dominant cost is
// browser launch + PagedJS pagination.

import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'
import { run } from '../src/run.js'

const since = t => Math.round(performance.now() - t)

const CASES = [
  ['letter', 'fixtures/letters/resolved-business.cmk', 'basel'],
  ['deck', 'fixtures/decks/resolved-polaris.cmk', 'basel'],
  ['folio', 'fixtures/folios/resolved-lichen.cmk', 'basel'],
  ['brief', 'fixtures/briefs/resolved-tideline.cmk', 'basel'],
  ['ledger', 'fixtures/ledgers/resolved-meridian.cmk', 'basel'],
  ['statement·paged', 'fixtures/ledgers/resolved-statement.cmk', 'basel'],
  ['composed', 'fixtures/composed/resolved-engagement.cmk', 'basel']
]

console.log('fixture            render(ms)  pages')
for (const [name, fixture, theme] of CASES) {
  const cmk = readFileSync(fixture, 'utf8')
  const t = performance.now()
  const r = await run(cmk, { theme, emitPdf: true })
  const ms = since(t)
  const note = r.segments ? `${r.segments.length} segments` : ''
  console.log(`${name.padEnd(18)}${String(ms).padStart(7)}ms   ${note}`)
}
console.log('\nOne Chromium per document (gate + printToPDF); composed: one per segment + an in-memory pdf-lib merge.')
