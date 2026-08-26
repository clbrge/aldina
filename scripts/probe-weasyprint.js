// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Renderer probe: render the canary formes through WeasyPrint (a candidate tagging-capable renderer) so
// its visual fidelity can be compared against the Chromium output. The themes were authored
// against Chromium, and WeasyPrint has its own CSS engine — the grid/flex classes (brief, ledger, deck)
// are the ones at risk. Builds the same forme run() would, then shells to weasyprint.
//   usage: make probe-weasyprint   (needs `pip install weasyprint`)
//   output: formes/weasyprint/*.pdf — compare with `make samples` → formes/*.pdf

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { toHtml } from 'choirmark'
import { frontMatter } from '../src/run.js'
import { resolveReferences } from '../src/xref.js'
import { deriveLedger } from '../src/ledger/derive.js'
import { compose } from '../src/compose.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'formes', 'weasyprint')

// Same fixtures/names as `make samples`, so each WeasyPrint PDF sits beside its Chromium twin.
const CASES = [
  ['letter-basel', 'fixtures/letters/resolved-business.cmk', 'basel'],
  ['polaris-basel', 'fixtures/decks/resolved-polaris.cmk', 'basel'],
  ['folio-basel', 'fixtures/folios/resolved-lichen.cmk', 'basel'],
  ['folio-report', 'fixtures/folios/resolved-report.cmk', 'basel'],
  ['brief-basel', 'fixtures/briefs/resolved-tideline.cmk', 'basel'],
  ['brief-studio', 'fixtures/briefs/resolved-tideline.cmk', 'studio'],
  ['ledger-basel', 'fixtures/ledgers/resolved-meridian.cmk', 'basel'],
  ['ledger-statement', 'fixtures/ledgers/resolved-statement.cmk', 'basel']
]

function buildForme (cmk, theme) {
  const meta = frontMatter(cmk)
  let pv = resolveReferences(toHtml(cmk))
  if (meta.class === 'ledger') pv = deriveLedger(pv, { locale: meta.locale, currency: meta.currency }).pivot
  return compose(pv, meta.class, theme, [], meta)
}

function weasyprint (htmlPath, pdfPath) {
  if (process.env.WEASYPRINT) {
    execFileSync(process.env.WEASYPRINT, [htmlPath, pdfPath], { stdio: ['ignore', 'ignore', 'pipe'] })
    return
  }
  try {
    execFileSync('weasyprint', [htmlPath, pdfPath], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (e) {
    if (!/ENOENT/.test(String(e.message))) throw e
    execFileSync('python3', ['-m', 'weasyprint', htmlPath, pdfPath], { stdio: ['ignore', 'ignore', 'pipe'] })
  }
}

mkdirSync(OUT, { recursive: true })
for (const [name, fixture, theme] of CASES) {
  const html = join(OUT, name + '.html')
  writeFileSync(html, buildForme(readFileSync(join(ROOT, fixture), 'utf8'), theme))
  try {
    weasyprint(html, join(OUT, name + '.pdf'))
    console.log(`  ok    ${name}.pdf`)
  } catch (e) {
    const msg = String(e.message)
    if (/ENOENT/.test(msg)) { console.error('WeasyPrint not found — `pip install weasyprint` (or pipx install weasyprint)'); process.exit(2) }
    console.log(`  FAIL  ${name} — ${msg.split('\n').find(l => /error|warning|unsupported/i.test(l)) || msg.split('\n')[0]}`)
  }
}
console.log('\nWeasyPrint → formes/weasyprint/*.pdf   ·   compare with Chromium: make samples → formes/*.pdf')
console.log('Watch the grid/flex classes: brief-basel, brief-studio, ledger-basel, ledger-statement, polaris-basel (deck).')
