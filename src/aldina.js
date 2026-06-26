#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina — the OUTPUT flow: make a document from ChoirMark content + an already-admitted grammar.
// (The LAYOUT flow — designing the grammar itself — is a SEPARATE flow; see PIPELINE.md. The grammar
//  used here, grammar/<class>.css, is that flow's product, hand-authored for now.)
//
// ONE fixed linear sequence; the three LLM checkpoints are ALWAYS present and degrade to IDENTITY
// when there's no residual. Judgment is ALLOCATED at fixed points; the work depends on the input.
//   assign → ①resolve-roles → compose → ②route → gate → ③repair → project
//
//   usage:  node src/aldina.js <source.md> [--class letter] [--out forme.html] [--pdf out.pdf]

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { assign, toRoleHtml } from './assign/assign.js'
import { compose } from './compose.js'
import { validate } from './harness/validate.js'

// ── LLM checkpoints — IDENTITY today (no API). Idempotent: complete-if-incomplete, else passthrough.
//    Wiring an LLM into a body activates it for the inputs that need it, WITHOUT changing the flow. ──
const resolveRoles = (model /* , ctx */) => model // ① resolve conf<high role flags; identity if none
const route = (forme /* , ctx */) => forme // ② route content WITHIN the grammar: deck archetype/slide-break, folio floats; identity if the grammar determines placement
const repair = (forme, _findings /* , ctx */) => forme // ③ repair gate findings; identity when admitted

export function run (src, klass = 'letter', theme = null, themeDir = null) {
  const trace = []
  const t = (stage, note) => trace.push({ stage, note })

  let { meta, model } = assign(src, klass) // deterministic
  const residual = model.filter(o => o.conf && o.conf !== 'high').length
  t('assign', `${model.length} blocks · ${residual} residual`)

  const m0 = model; model = resolveRoles(model) // ① checkpoint
  t('resolve-roles', model === m0 ? `identity${residual ? ` (stub; ${residual} kept as deterministic guess)` : ''}` : 'active')

  let forme = compose(toRoleHtml(model, klass, meta), klass, theme, themeDir) // deterministic — into the theme's grammar
  t('compose', `forme · ${meta.format || klass}${theme ? ` · theme=${theme}` : ''}`)

  const f0 = forme; forme = route(forme) // ② checkpoint (route within grammar)
  t('route', forme === f0 ? 'identity (grammar determines placement)' : 'active')

  let res = validate(forme) // gate
  t('gate', res.passed ? 'PASS' : `FAIL (${res.findings.filter(f => f.status === 'fail').length})`)

  let iters = 0 // ③ checkpoint (bounded loop)
  while (!res.passed && iters++ < 3) {
    const before = forme; forme = repair(forme, res.findings)
    if (forme === before) { t('repair', 'identity (stub) — no progress; stopping'); break }
    res = validate(forme); t('repair', `re-gate ${res.passed ? 'PASS' : 'FAIL'}`)
  }

  return { forme, res, trace, meta, model }
}

// project (deterministic) — HTML → PDF. Single-page formes only; multipage needs pagedjs-cli.
function project (formeHtml, pdfPath) {
  const tmp = join(mkdtempSync(join(tmpdir(), 'aldina-')), 'forme.html')
  writeFileSync(tmp, formeHtml)
  const chromium = process.env.CHROMIUM || 'chromium'
  execFileSync(chromium, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf=' + pdfPath, 'file://' + tmp], { stdio: ['ignore', 'ignore', 'ignore'] })
}

// ── CLI ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = f => process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : null
  const file = process.argv[2]
  if (!file) { console.error('usage: src/aldina.js <source.md> [--class letter] [--theme oxford] [--theme-dir DIR] [--out forme.html] [--pdf out.pdf]'); process.exit(2) }
  const klass = arg('--class') || 'letter'
  const theme = arg('--theme')
  const themeDir = arg('--theme-dir') || process.env.ALDINA_THEME_DIR || null
  try {
    const { forme, res, trace } = run(readFileSync(file, 'utf8'), klass, theme, themeDir)
    console.log(`\n  ${file.split('/').pop()} · class=${klass}${theme ? ` · theme=${theme}` : ''}  (output flow)`)
    for (const { stage, note } of trace) console.log(`    ${stage.padEnd(14)} ${note}`)
    const out = arg('--out'); const pdf = arg('--pdf')
    if (res.passed && out) { writeFileSync(out, forme); console.log(`    out            ${out}`) }
    if (res.passed && pdf) { project(forme, pdf); console.log(`    project        ${pdf}`) }
    console.log(`  → ${res.passed ? 'ADMITTED' : 'REJECTED'}`)
    process.exit(res.passed ? 0 : 1)
  } catch (e) { console.error('aldina: ' + e.message); process.exit(2) }
}
