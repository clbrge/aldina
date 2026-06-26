#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina layout-compose — role-tagged HTML → a static forme. Library + CLI.
//
// Loads a THEME (tokens + the class grammar) and routes the content into it: partition roles into
// PINNED (positioned by the grammar) vs FLOW (.content), wrap, inline the CSS. The Zen-Garden join.
// Without a theme it falls back to the self-contained grammar/<class>.css (legacy).
//   usage:  node src/assign/assign.js <src> --emit | node src/compose.js [--class letter] [--theme oxford] [--theme-dir DIR]

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

// Theme resolution: an external --theme-dir (e.g. private/premium themes) is searched first, then
// the built-in themes/ (at the repo root, one level up from src/). A named theme that resolves
// nowhere is an error — no silent fallback.
const BUILTIN_THEMES = fileURLToPath(new URL('../themes/', import.meta.url))
function themeDirPath (theme, themeDir) {
  const candidates = (themeDir ? [join(themeDir, theme)] : []).concat(join(BUILTIN_THEMES, theme))
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`compose: theme '${theme}' not found (looked in: ${candidates.join(', ')})`)
  return found
}
const themeCss = (theme, files, themeDir) =>
  files.map(f => readFileSync(join(themeDirPath(theme, themeDir), f), 'utf8')).join('\n')

const PINNED = { letter: new Set(['sender-block', 'date', 'recipient-block']) }

// deck: per-archetype role→zone routing (the deterministic "route"; archetypes are author-marked)
const DECK_ZONES = {
  title:     { eyebrow: 'mark', 'big-statement': 'hero', subtitle: 'hero', caption: 'foot' },
  content:   { eyebrow: 'eyebrow', 'slide-title': 'title', 'body-paragraph': 'body', caption: 'aside' },
  statement: { 'big-statement': 'statement' },
  stat:      { eyebrow: 'eyebrow', 'big-stat': 'stat', caption: 'caption' },
  colophon:  { motto: 'mark', subtitle: 'mark', caption: 'foot' }
}

function composeDeck (roleHtml, theme, themeDir) {
  const slides = [...roleHtml.matchAll(/<section\s+data-archetype="([\w-]*)"(\s+data-ink)?>([\s\S]*?)<\/section>/g)].map(sec => {
    const arch = sec[1], ink = !!sec[2], map = DECK_ZONES[arch] || {}
    const zones = {}, order = []
    for (const e of [...sec[3].matchAll(/<(div|h\d|p|ul|ol)\s+data-role="([\w-]+)"[^>]*>[\s\S]*?<\/\1>/g)]) {
      const z = map[e[2]] || 'body'
      if (!zones[z]) { zones[z] = []; order.push(z) }
      zones[z].push(e[0].trim())
    }
    const zh = order.map(z => `    <div class="z-${z}" data-zone="${z}">\n      ${zones[z].join('\n      ')}\n    </div>`).join('\n')
    return `  <section class="slide${ink ? ' ink' : ''} a-${arch}">\n${zh}\n  </section>`
  }).join('\n')
  const css = themeCss(theme, ['tokens.css', 'deck.css'], themeDir)
  return `<!doctype html>
<html lang="en" data-min-font="16">
<head><meta charset="utf-8"><title>Aldina deck — ${theme}</title>
<style>
${css}</style></head>
<body>
${slides}
</body>
</html>
`
}

function loadCss (klass, theme, themeDir) {
  if (theme) return themeCss(theme, ['tokens.css', `${klass}.css`], themeDir)
  return readFileSync(new URL(`./grammar/${klass}.css`, import.meta.url), 'utf8')
}

export function compose (roleHtml, klass = 'letter', theme = null, themeDir = null) {
  if (klass === 'deck') return composeDeck(roleHtml, theme, themeDir)
  const art = roleHtml.match(/<article([^>]*)>([\s\S]*?)<\/article>/)
  if (!art) throw new Error('compose: no <article> in role-tagged HTML')
  const attrs = art[1]
  const blocks = [...art[2].matchAll(/<(div|ul|ol)\s+data-role="([\w-]+)"[^>]*>[\s\S]*?<\/\1>/g)].map(m => ({ role: m[2], html: m[0].trim() }))
  const pinSet = PINNED[klass] || new Set()
  const pinned = blocks.filter(b => pinSet.has(b.role)).map(b => b.html).join('\n    ')
  const flow = blocks.filter(b => !pinSet.has(b.role)).map(b => b.html).join('\n      ')
  const css = loadCss(klass, theme, themeDir)
  return `<!doctype html>
<html lang="en" data-min-font="12">
<head><meta charset="utf-8"><title>Aldina forme — ${klass}${theme ? ' · ' + theme : ''}</title>
<style>
${css}</style></head>
<body>
  <article class="page"${attrs}>
    ${pinned}
    <section class="content">
      ${flow}
    </section>
  </article>
</body>
</html>
`
}

// ── CLI ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = f => process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : null
  const themeDir = arg('--theme-dir') || process.env.ALDINA_THEME_DIR || null
  process.stdout.write(compose(readFileSync(0, 'utf8'), arg('--class') || 'letter', arg('--theme'), themeDir))
}
