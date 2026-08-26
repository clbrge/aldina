// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// `make` — the verbless default: a resolved ChoirMark source + a theme → a projected document.

import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, extname, delimiter } from 'node:path'
import { run, frontMatter } from '../run.js'
import { flag, flagVal, flagVals, parseJsonFlag, readStdin } from './args.js'
import { loadEditions } from './editions.js'

const err = s => process.stderr.write(s + '\n')

function optValFlag (args, name) {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  const next = args[i + 1]
  if (next !== undefined && (next === '-' || !next.startsWith('-'))) { args.splice(i, 2); return next }
  args.splice(i, 1)
  return true
}

const HELP = `aldina make — resolved ChoirMark → projected document (the verbless default)

Usage:
  aldina <source.cmk> [dest]              make; PDF next to the source by default
  aldina <source.cmk> --html [dest]       emit the forme HTML instead of a PDF
  cat doc.cmk | aldina --from cmk          read from stdin → stdout

Options:
  --theme <name[@edition]>   theme (else config default per class, else oxford)
  --theme-dir <dir>          extra theme dir; repeatable; also ALDINA_THEME_DIR / config themeDirs
  --edition-dir <dir>        ledger edition dir (*.json); repeatable; also ALDINA_EDITION_DIR
  --pdf [path]               PDF output; '-' = stdout
  --html [path]              forme HTML output; '-' = stdout
  --from cmk|md              input tier for stdin (files are inferred by extension)
  --model <id>               LLM for resolving a loose .md (default openai/gpt-5.4-mini)
  --no-llm                   deterministic only for a loose .md (no API call)
  --insecure                 allow theme CSS to break out of the style block (own theme, own risk)
  --json                     machine-readable {passed, findings, trace} to stdout

Output:
  stdout: the artifact, only when its destination is '-'
  stderr: the stage trace and the ADMITTED/REJECTED verdict
  exit:   0 admitted · 1 rejected by the gate · 2 usage / IO / parse / render error`

export async function runMake (args) {
  if (flag(args, '-h') || flag(args, '--help')) { process.stdout.write(HELP + '\n'); return 0 }

  const json = parseJsonFlag(args)
  const cliTheme = flagVal(args, '--theme')
  const cliDirs = flagVals(args, '--theme-dir')
  const fromFlag = flagVal(args, '--from')
  const noLlm = flag(args, '--no-llm')
  const insecure = flag(args, '--insecure')
  const llmModel = flagVal(args, '--model') || 'openai/gpt-5.4-mini'
  const pdf = optValFlag(args, '--pdf')
  const html = optValFlag(args, '--html')
  const positionals = args.filter(a => a === '-' || !a.startsWith('-'))
  const source = positionals[0]
  let dest = positionals[1] || null

  const stdin = !source || source === '-'
  const src = stdin ? await readStdin() : readFileSync(source, 'utf8')
  const from = fromFlag || (stdin ? 'cmk' : (source.endsWith('.cmk') ? 'cmk' : 'md'))

  let format = 'pdf'
  if (html !== undefined) {
    format = 'html'
    if (html !== true) dest = html
  } else if (pdf !== undefined) {
    if (pdf !== true) dest = pdf
  }
  if (dest && extname(dest) === '.html') format = 'html'
  if (dest && extname(dest) === '.pdf') format = 'pdf'

  const docMeta = frontMatter(src)
  const klass = docMeta.class
  let theme = cliTheme
  let themeDirs = [...cliDirs, ...(process.env.ALDINA_THEME_DIR || '').split(delimiter).filter(Boolean)]
  if (!theme) {
    const cfg = await import('./config.js')
    const config = cfg.loadConfig()
    theme = cfg.resolveTheme(undefined, klass, config)
    themeDirs = cfg.resolveThemeDirs(cliDirs, config)
  }

  if (klass && klass !== 'composed') {
    const { discoverThemes, BUILTIN } = await import('./themes.js')
    const available = discoverThemes([...themeDirs, BUILTIN])
    const found = available.find(t => t.name === theme.split('@')[0])
    if (found && found.classes.length && !found.classes.includes(klass)) {
      const covering = available.filter(t => t.classes.includes(klass)).map(t => t.name)
      throw new Error(`theme '${theme}' does not cover class '${klass}'${covering.length ? ` — try --theme ${covering.join(' / ')}` : ' (no installed theme covers it)'}`)
    }
  }

  const editionDirs = [...flagVals(args, '--edition-dir'), ...(process.env.ALDINA_EDITION_DIR || '').split(delimiter).filter(Boolean)]
  const editions = loadEditions(editionDirs)

  let resolver
  if (from === 'md' && !noLlm) {
    const { makeResolver } = await import('./resolver.js')
    resolver = await makeResolver({ model: llmModel })
  }

  const { forme, segments, res, pdf: pdfBytes, trace } = await run(src, { theme, themeDirs, from, resolver, editions, emitPdf: format === 'pdf', insecure })
  for (const { stage, note } of trace) err(`    ${stage.padEnd(14)} ${note}`)

  if (!dest) dest = stdin ? '-' : join(dirname(source), basename(source, extname(source)) + '.' + format)

  if (json) {
    process.stdout.write(JSON.stringify({ passed: res.passed, dest: res.passed ? dest : null, findings: res.findings, trace }, null, 2) + '\n')
  } else if (res.passed) {
    if (segments) {
      if (dest === '-') throw new Error('a composed document needs a file destination (it is multi-segment)')
      if (format === 'html') {
        const base = dest.replace(/\.html$/, '')
        segments.forEach((s, i) => { const p = `${base}.${i + 1}.${s.klass}.html`; writeFileSync(p, s.forme); err(`    html           ${p}`) })
      } else {
        writeFileSync(dest, pdfBytes)
        err(`    pdf            ${dest} (${segments.length} segments merged)`)
      }
    } else if (dest === '-') {
      if (format === 'html') process.stdout.write(forme)
      else throw new Error('cannot stream PDF to stdout yet — give a file destination')
    } else if (format === 'html') {
      writeFileSync(dest, forme)
      err(`    ${format.padEnd(14)} ${dest}`)
    } else {
      writeFileSync(dest, pdfBytes)
      err(`    ${format.padEnd(14)} ${dest}`)
    }
  }

  err(`  → ${res.passed ? 'ADMITTED' : 'REJECTED'}`)
  return res.passed ? 0 : 1
}
