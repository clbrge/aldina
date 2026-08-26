#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina layout-compose — role-tagged pivot → a static forme. Library + CLI.
//
// Loads a THEME (tokens + the class grammar) and forwards the role-tagged pivot into it nearly as-is —
// the theme's CSS lays out the carried names ([data-role]/[data-zone]/[data-slide-type]); compose does
// not restructure. It wraps the pivot in the class's surface element, deriving the wrapper attributes
// from the document class + front matter. A theme is required — a missing theme is a loud error.
//   usage:  choirmark toHtml <resolved.cmk> | node src/compose.js --theme oxford [--class letter] [--theme-dir DIR]

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

// Theme resolution: a search path — the caller's themeDirs (external/private/premium) in order, then
// the built-in themes/ (one level up from src/). First match wins; a name that resolves nowhere is a
// loud error naming every dir searched (no silent fallback). A `name@edition` resolves by `name`.
const BUILTIN_THEMES = fileURLToPath(new URL('../themes/', import.meta.url))
function themeDirPath (theme, themeDirs) {
  const name = theme.split('@')[0]
  const candidates = [...themeDirs.map(d => join(d, name)), join(BUILTIN_THEMES, name)]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`compose: theme '${name}' not found (looked in: ${candidates.join(', ')})`)
  return found
}
export const cssBreaksOut = css => /<\/style/i.test(css)

const themeCss = (theme, files, themeDirs, insecure = false) => {
  const dir = themeDirPath(theme, themeDirs)
  const css = files.map(f => {
    const p = join(dir, f)
    if (!existsSync(p)) throw new Error(`compose: theme '${theme.split('@')[0]}' has no '${f}' — it does not cover this class/variant (looked in ${dir})`)
    return readFileSync(p, 'utf8')
  }).join('\n')
  if (!insecure && cssBreaksOut(css)) throw new Error(`compose: theme '${theme.split('@')[0]}' CSS contains '</style>' — it would break out of the style block and inject markup into the forme the gate measures. Refused; pass --insecure to override with your own theme at your own risk.`)
  return css
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const geo = meta => (meta.format ? ` data-format="${esc(meta.format)}"` : '') + (meta.window ? ` data-window="${esc(meta.window)}"` : '')
const intl = meta => (meta.lang ? ` lang="${esc(meta.lang)}"` : '') + (meta.dir ? ` dir="${esc(meta.dir)}"` : '')
const articleAttrs = (klass, meta) => ` data-class="${esc(klass)}"${geo(meta)}${intl(meta)}`
const htmlOpen = (meta, minFont, paged) => `<html lang="${esc(meta.lang || 'en')}"${meta.dir ? ` dir="${esc(meta.dir)}"` : ''}${paged ? ' data-paged' : ''} data-min-font="${minFont}">`
const docTitle = (meta, label) => meta.title ? esc(meta.title) : label

function composeDeck (pivot, theme, themeDirs, meta, insecure) {
  const css = themeCss(theme, ['tokens.css', 'deck.css'], themeDirs, insecure)
  return `<!doctype html>
${htmlOpen(meta, 16)}
<head><meta charset="utf-8"><title>${docTitle(meta, 'Aldina deck — ' + esc(theme))}</title>
<style>
${css}</style></head>
<body>
${pivot}
</body>
</html>
`
}

function composeFolio (pivot, theme, themeDirs, meta, insecure) {
  const head = meta.title
    ? `<header class="doc-head"><h1 class="doc-title">${esc(meta.title)}</h1>${meta.authors ? `<p class="authors">${esc(meta.authors)}</p>` : ''}</header>`
    : ''
  const report = meta['class-variant'] === 'report'
  const css = themeCss(theme, ['tokens.css', 'folio.css', report ? 'folio-report.css' : 'folio-article.css'], themeDirs, insecure)
  return `<!doctype html>
${htmlOpen(meta, 12, report)}
<head><meta charset="utf-8"><title>${docTitle(meta, 'Aldina folio — ' + esc(theme))}</title>
<style>
${css}</style></head>
<body>
  <article class="${report ? 'report' : 'page'}"${articleAttrs('folio', meta)}>
${head}
${pivot}
${report ? '<p id="doc-end" aria-hidden="true" style="block-size:0;font-size:1px;line-height:0;color:transparent">end</p>' : ''}
  </article>
</body>
</html>
`
}

function composeLedger (pivot, theme, themeDirs, meta, insecure) {
  const paged = meta['class-variant'] === 'statement'
  const css = themeCss(theme, paged ? ['tokens.css', 'ledger-statement.css'] : ['tokens.css', 'ledger.css'], themeDirs, insecure)
  return `<!doctype html>
${htmlOpen(meta, 12, paged)}
<head><meta charset="utf-8"><title>${docTitle(meta, 'Aldina ledger — ' + esc(theme))}</title>
<style>
${css}</style></head>
<body>
  <article class="${paged ? 'statement' : 'page'}"${articleAttrs('ledger', meta)}>
${pivot}
${paged ? '    <p id="doc-end" aria-hidden="true" style="block-size:0;font-size:1px;line-height:0;color:transparent">end</p>' : ''}
  </article>
</body>
</html>
`
}

function composeLetterPaged (pivot, theme, themeDirs, meta, insecure) {
  const css = themeCss(theme, ['tokens.css', 'letter-continuation.css'], themeDirs, insecure)
  return `<!doctype html>
${htmlOpen(meta, 12, true)}
<head><meta charset="utf-8"><title>${docTitle(meta, 'Aldina letter — ' + esc(theme))}</title>
<style>
${css}</style></head>
<body>
  <article class="letter"${articleAttrs('letter', meta)}>
${pivot}
    <p id="doc-end" aria-hidden="true" style="block-size:0;font-size:1px;line-height:0;color:transparent">end</p>
  </article>
</body>
</html>
`
}

export function compose (pivot, klass = 'letter', theme = null, themeDirs = [], meta = {}, insecure = false) {
  if (!theme) throw new Error('compose: a theme is required (e.g. --theme oxford)')
  if (klass === 'deck') return composeDeck(pivot, theme, themeDirs, meta, insecure)
  if (klass === 'folio') return composeFolio(pivot, theme, themeDirs, meta, insecure)
  if (klass === 'ledger') return composeLedger(pivot, theme, themeDirs, meta, insecure)
  if (klass === 'letter' && meta['class-variant'] === 'continuation') return composeLetterPaged(pivot, theme, themeDirs, meta, insecure)
  const variant = meta['class-variant']
  const css = themeCss(theme, ['tokens.css', `${klass}.css`, ...(variant ? [`${klass}-${variant}.css`] : [])], themeDirs, insecure)
  return `<!doctype html>
${htmlOpen(meta, 12)}
<head><meta charset="utf-8"><title>${docTitle(meta, 'Aldina forme — ' + esc(klass) + (theme ? ' · ' + esc(theme) : ''))}</title>
<style>
${css}</style></head>
<body>
  <article class="page"${articleAttrs(klass, meta)}>
${pivot}
  </article>
</body>
</html>
`
}

// ── CLI ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = f => process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : null
  const themeDirs = (arg('--theme-dir') || process.env.ALDINA_THEME_DIR || '').split(/[:;]/).filter(Boolean)
  process.stdout.write(compose(readFileSync(0, 'utf8'), arg('--class') || 'letter', arg('--theme'), themeDirs, {}, process.argv.includes('--insecure')))
}
