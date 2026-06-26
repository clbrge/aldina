#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina role-assigner — ChoirMark (.cmk) → role-tagged content. Library + CLI.
//
// Applies the hint-vs-contract gradient from the ChoirMark spec: explicit `::: role`/`[x]{.role}` and
// structural constructs are high-confidence (contract); plain blocks are inferred by pattern/position
// (hint), low confidence flagged for the LLM. Unknown explicit role → error (no silent fallback).
//   usage:  node src/assign/assign.js <source.md> [--class letter] [--emit]

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function loadRoles (klass) {
  const vocab = new Set()
  try {
    const y = readFileSync(new URL(`../roles/${klass}.yaml`, import.meta.url), 'utf8')
    let inRoles = false
    for (const line of y.split('\n')) {
      if (/^roles:/.test(line)) { inRoles = true; continue }
      if (inRoles) { if (/^\S/.test(line)) break; const m = line.match(/^ {2}([a-z][\w-]*):\s*$/); if (m) vocab.add(m[1]) }
    }
  } catch { /* no roles file */ }
  return vocab
}

// ── deck class: slides delimited by `---`, each tagged {.archetype [.ink]} with `::: role` element divs ──
function assignDeck (src) {
  const slides = []
  for (const chunk of src.split(/^---\s*$/m)) {
    if (!chunk.trim()) continue
    const am = chunk.match(/\{([^}]*)\}/)
    let archetype = null; let ink = false; let rest = chunk
    if (am) {
      const cls = (am[1].match(/\.([\w-]+)/g) || []).map(s => s.slice(1))
      ink = cls.includes('ink'); archetype = cls.find(c => c !== 'ink' && c !== 'slide') || null
      rest = chunk.replace(am[0], '')
    }
    const elements = []; const re = /:::+\s*(?:\{\.?([\w-]+)[^}]*\}|([\w-]+))\s*\n([\s\S]*?)\n:::+/g; let m
    while ((m = re.exec(rest))) elements.push({ role: m[1] || m[2], content: (m[3] || '').trim() })
    if (archetype || elements.length) slides.push({ archetype, ink, elements })
  }
  return slides
}

function deckRoleHtml (slides, meta) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const sections = slides.map(s => {
    const els = s.elements.map(e => `    <div data-role="${e.role}">${esc(e.content)}</div>`).join('\n')
    return `  <section data-archetype="${s.archetype || ''}"${s.ink ? ' data-ink' : ''}>\n${els}\n  </section>`
  }).join('\n')
  return `<article data-class="deck"${meta.theme ? ` data-theme="${meta.theme}"` : ''}>\n${sections}\n</article>`
}

export function assign (src, klass = 'letter') {
  // front-matter
  const fm = src.match(/^---\n[\s\S]*?\n---\n?/); const meta = {}
  if (fm) { for (const l of fm[0].split('\n')) { const m = l.match(/^([\w-]+):\s*(.*)$/); if (m) meta[m[1]] = m[2] }; src = src.slice(fm[0].length) }

  if (klass === 'deck') return { meta, model: assignDeck(src) }

  // block parse (the ChoirMark Pandoc profile, minimal)
  const lines = src.split('\n'); const blocks = []; let i = 0
  const blank = s => !s.trim()
  const special = s => /^(:::|```|#{1,6}\s|>\s?|\s*([-*+]|\d+[.)])\s)/.test(s)
  while (i < lines.length) {
    const line = lines[i]
    if (blank(line)) { i++; continue }
    let m
    if ((m = line.match(/^:::+\s*(?:\{\.?([\w-]+)[^}]*\}|([\w-]+))?\s*$/))) {
      const role = m[1] || m[2] || null; i++; const inner = []
      while (i < lines.length && !/^:::+\s*$/.test(lines[i])) { inner.push(lines[i]); i++ }
      i++; blocks.push({ type: 'div', role, lines: inner.filter(x => x.trim()) }); continue
    }
    if (/^```/.test(line)) { i++; const c = []; while (i < lines.length && !/^```/.test(lines[i])) { c.push(lines[i]); i++ } i++; blocks.push({ type: 'code', lines: c }); continue }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) { const items = []; const ordered = /^\s*\d+[.)]/.test(line); while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '')); i++ } blocks.push({ type: 'list', ordered, items }); continue }
    if (/^#{1,6}\s/.test(line)) { blocks.push({ type: 'heading', level: line.match(/^#+/)[0].length, text: line.replace(/^#+\s/, '') }); i++; continue }
    if (/^>\s?/.test(line)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++ } blocks.push({ type: 'quote', lines: q }); continue }
    const para = []; while (i < lines.length && !blank(lines[i]) && !special(lines[i])) { para.push(lines[i]); i++ }
    blocks.push({ type: 'para', lines: para })
  }

  // classify → model
  const reDate = /^\s*([A-Z][a-z]+ \d{1,2},? \d{4}|\d{1,2} [A-Z][a-z]+ \d{4}|\d{4}-\d{2}-\d{2})\s*$/
  const reSubject = /^\s*(RE:|Re:|Subject:)/
  const reSalut = /^\s*(Dear |To Whom It May Concern)/
  const reEnc = /^\s*(Enc[.:]|Enclosure)/i
  const reCc = /^\s*cc:/i
  const rePs = /^\s*P\.?\s?S\.?/
  const reCSZ = /,\s*[A-Z]{2}\s+\d{5}/
  const reSpan = /^\s*\[([^\]]*)\]\{\.([\w-]+)\}\s*$/
  const closings = ['Sincerely yours', 'Yours sincerely', 'Yours faithfully', 'Yours truly', 'Best regards', 'Kind regards', 'With deepest sympathy', 'With sincere apologies', 'With love', 'Love always', 'Sincerely', 'Regards', 'Respectfully', 'Cordially', 'Warmly', 'Best', 'Love']
  const reClosing = new RegExp('^\\s*(' + closings.join('|') + '),?\\s*$', 'i')

  const model = []; let phase = 'pre'; let senderSeen = false; let sigSeen = false
  const push = (role, by, conf, content, extra = {}) => model.push({ role, by, conf, content, ...extra })
  for (const b of blocks) {
    if (b.type === 'div') { push(b.role, 'explicit', 'high', b.lines); continue }
    if (b.type === 'list') { push('list', 'structural', 'high', b.items, { ordered: b.ordered }); continue }
    if (b.type === 'code') { push('code-block', 'structural', 'high', b.lines); continue }
    if (b.type === 'quote') { push('pull-quote', 'structural', 'high', b.lines); continue }
    if (b.type === 'heading') { push('subject', 'structural', 'med', [b.text]); continue }
    const first = b.lines[0]
    const sm = b.lines.length === 1 && first.match(reSpan)
    if (sm) { push(sm[2], 'explicit', 'high', [sm[1]]); continue }
    if (b.lines.length === 1 && reDate.test(first)) { push('date', 'pattern', 'high', b.lines); continue }
    if (reSubject.test(first)) { push('subject', 'pattern', 'high', b.lines); continue }
    if (reSalut.test(first)) { push('salutation', 'pattern', 'high', b.lines); phase = 'body'; continue }
    if (reClosing.test(first)) { push('closing', 'pattern', 'high', [first]); if (b.lines.length > 1) { push('signature-block', 'position', 'med', b.lines.slice(1)); sigSeen = true } phase = 'post'; continue }
    if (reEnc.test(first)) { push('enclosures', 'pattern', 'high', b.lines); continue }
    if (reCc.test(first)) { push('cc', 'pattern', 'high', b.lines); continue }
    if (rePs.test(first)) { push('postscript', 'pattern', 'high', b.lines); continue }
    if (phase === 'pre') {
      const addrLike = b.lines.length >= 2 || reCSZ.test(b.lines.join('\n'))
      if (addrLike) { push(senderSeen ? 'recipient-block' : 'sender-block', 'position', 'med', b.lines); senderSeen = true; continue }
      push('body-paragraph', 'default', 'low', b.lines); continue
    }
    if (phase === 'post' && !sigSeen) { push('signature-block', 'position', 'med', b.lines); sigSeen = true; continue }
    push('body-paragraph', 'structural', 'high', b.lines)
  }

  // validate roles (no silent fallback)
  const vocab = loadRoles(klass)
  if (vocab.size) {
    const bad = [...new Set(model.map(o => o.role).filter(r => !vocab.has(r)))]
    if (bad.length) throw new Error(`unknown role(s) not in roles/${klass}.yaml: ${bad.join(', ')}`)
  }
  return { meta, model }
}

export function toRoleHtml (model, klass = 'letter', meta = {}) {
  if (klass === 'deck') return deckRoleHtml(model, meta)
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const body = model.map(o => {
    const inner = (Array.isArray(o.content) ? o.content : [o.content]).map(esc)
    if (o.role === 'list') { const t = o.ordered ? 'ol' : 'ul'; return `  <${t} data-role="list">${inner.map(x => `<li>${x}</li>`).join('')}</${t}>` }
    return `  <div data-role="${o.role}">${inner.join('<br>')}</div>`
  }).join('\n')
  return `<article data-class="${klass}"${meta.format ? ` data-format="${meta.format}"` : ''}${meta.window ? ` data-window="${meta.window}"` : ''}>\n${body}\n</article>`
}

export function summarize (model, name = '', klass = 'letter') {
  const snip = o => (Array.isArray(o.content) ? o.content.join(' ') : String(o.content)).slice(0, 46).replace(/\s+/g, ' ')
  const review = model.filter(o => o.conf !== 'high').length
  let s = `\n  ${name.split('/').pop()}  ·  class=${klass}  ·  ${model.length} blocks  ·  ${review} → review (LLM)\n`
  for (const o of model) s += `  ${o.conf === 'high' ? '  ' : '→ '}${o.role.padEnd(16)} ${(o.by + '/' + o.conf).padEnd(16)} ${snip(o)}\n`
  return s
}

// ── CLI ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2]
  if (!file) { console.error('usage: src/assign/assign.js <source.md> [--class letter] [--emit]'); process.exit(2) }
  const klass = process.argv.includes('--class') ? process.argv[process.argv.indexOf('--class') + 1] : 'letter'
  try {
    const { meta, model } = assign(readFileSync(file, 'utf8'), klass)
    console.log(process.argv.includes('--emit') ? toRoleHtml(model, klass, meta) : summarize(model, file, klass))
  } catch (e) { console.error('ERROR — ' + e.message); process.exit(1) }
}
