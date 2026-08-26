#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Theme conformance — every canary fixture, through every theme that declares its class, gated.
//   usage:  node scripts/conformance.js [--theme-dir <dir>] [--json]
//   env:    CHROMIUM=/path/to/chromium  (else 'chromium' on PATH)
//   exit:   0 all covered cells pass · 1 a covered cell failed · 2 setup error

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { run, frontMatter } from '../src/run.js'
import { discoverThemes } from '../src/cli/themes.js'
import { loadEditions } from '../src/cli/editions.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BUILTIN = join(ROOT, 'themes')
const FIXTURES = join(ROOT, 'fixtures')

const arg = name => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1] }
const has = name => process.argv.includes(name)

function fixtures () {
  const out = []
  for (const cls of readdirSync(FIXTURES)) {
    const dir = join(FIXTURES, cls)
    let entries
    try { entries = readdirSync(dir) } catch { continue }
    for (const f of entries) {
      if (!f.startsWith('resolved-') || !f.endsWith('.cmk')) continue
      const path = join(dir, f)
      const src = readFileSync(path, 'utf8')
      const meta = frontMatter(src)
      const need = meta.class === 'composed'
        ? [...new Set([...src.matchAll(/:{3,}segment\{\.([a-z]+)/g)].map(m => m[1]))]
        : [meta.class]
      out.push({ id: relative(FIXTURES, path), src, klass: meta.class, variant: meta.variant || meta['class-variant'], need })
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

const themeDirs = (theme) => [dirname(theme.dir)]

async function main () {
  const extra = arg('--theme-dir')
  const themes = discoverThemes([...(extra ? [extra] : []), BUILTIN])
  const editions = loadEditions([join(FIXTURES, 'editions')])
  const fix = fixtures()
  const rows = []
  let pass = 0; let fail = 0; let skip = 0

  for (const theme of themes) {
    const covered = new Set(theme.classes)
    const cells = []
    for (const f of fix) {
      if (!f.need.every(c => covered.has(c))) { cells.push({ f, status: 'skip' }); skip++; continue }
      try {
        const { res } = await run(f.src, { theme: theme.name, themeDirs: themeDirs(theme), editions, emitPdf: false })
        cells.push({ f, status: res.passed ? 'pass' : 'fail', findings: res.findings.filter(x => x.status === 'fail') })
        res.passed ? pass++ : fail++
      } catch (e) {
        cells.push({ f, status: 'error', error: e.message }); fail++
      }
    }
    rows.push({ theme, cells })
  }

  if (has('--json')) {
    process.stdout.write(JSON.stringify({ pass, fail, skip, rows: rows.map(r => ({ theme: r.theme.name, cells: r.cells.map(c => ({ fixture: c.f.id, status: c.status, findings: c.findings, error: c.error })) })) }, null, 2) + '\n')
    return fail ? 1 : 0
  }

  const mark = { pass: 'PASS', fail: 'FAIL', error: ' ERR', skip: '  — ' }
  process.stdout.write('\naldina theme conformance — canary fixtures × themes → gate\n')
  for (const { theme, cells } of rows) {
    process.stdout.write(`\n${theme.name}  [${theme.classes.join(' ')}]\n`)
    for (const c of cells) {
      const tag = c.f.variant ? `${c.f.klass}/${c.f.variant}` : (c.f.need.length > 1 ? c.f.need.join('+') : c.f.klass)
      process.stdout.write(`  ${mark[c.status]}  ${c.f.id.padEnd(38)} (${tag})\n`)
      if (c.status === 'fail') for (const x of c.findings) process.stdout.write(`        ✗ ${x.check}: ${x.detail}\n`)
      if (c.status === 'error') process.stdout.write(`        ✗ ${c.error}\n`)
    }
  }
  process.stdout.write(`\n  ${pass} pass · ${fail} fail · ${skip} not-covered\n`)
  return fail ? 1 : 0
}

process.exit(await main())
