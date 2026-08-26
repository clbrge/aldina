#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina role-assigner — loose ChoirMark (.md) → role-tagged model. Library + CLI.
//
// Parses with ChoirMark's parse() (the reference mdast reader), then assigns a role to each
// top-level block: an explicit directive is the contract (high confidence); a plain block is
// inferred by pattern/position (hint), low confidence flagged for the LLM. Structural content
// (lists, code, quotes, prose) carries no role — it passes through as native markdown. An unknown
// explicit role is an error, validated against ChoirMark's vocabularies (the single source of truth).
//   usage:  node src/assign/assign.js <source.md> [--class letter] [--emit]

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse, vocabularies, elementRoles, structuralDirectives } from 'choirmark'
import { modelToCmk } from '../emit-cmk.js'

const anyClassRole = new Set([...elementRoles, ...structuralDirectives])

const sliceOf = (src, n) => src.slice(n.position.start.offset, n.position.end.offset)
const linesOf = raw => raw.split('\n').filter(x => x.trim())

function directiveLines (src, node) {
  if (!node.children || !node.children.length) return []
  const a = node.children[0].position.start.offset
  const b = node.children[node.children.length - 1].position.end.offset
  return linesOf(src.slice(a, b))
}

export function assign (src, klass = 'letter') {
  const tree = parse(src)
  const meta = {}
  const fm = tree.children.find(n => n.type === 'yaml')
  if (fm) for (const l of fm.value.split('\n')) { const m = l.match(/^([\w-]+):\s*(.*)$/); if (m) meta[m[1]] = m[2] }

  const model = klass === 'letter' ? assignLetter(src, tree) : assignGeneric(src, tree)

  const vocab = vocabularies[klass]
  if (vocab) {
    const bad = [...new Set(model.map(o => o.role).filter(r => r && !vocab.has(r) && !anyClassRole.has(r)))]
    if (bad.length) throw new Error(`unknown role(s) for class ${klass}: ${bad.join(', ')}`)
  }
  return { meta, model }
}

function assignGeneric (src, tree) {
  const model = []
  for (const node of tree.children) {
    if (node.type === 'yaml') continue
    const raw = sliceOf(src, node)
    if (node.type === 'containerDirective' || node.type === 'leafDirective') { model.push({ role: node.name, by: 'explicit', conf: 'high', content: directiveLines(src, node) }); continue }
    if (node.type === 'paragraph' || node.type === 'list') { model.push({ role: null, by: 'default', conf: 'low', raw }); continue }
    model.push({ role: null, by: 'structural', conf: 'high', raw })
  }
  return model
}

function assignLetter (src, tree) {
  const reDate = /^\s*([A-Z][a-z]+ \d{1,2},? \d{4}|\d{1,2} [A-Z][a-z]+ \d{4}|\d{4}-\d{2}-\d{2})\s*$/
  const reSubject = /^\s*(RE:|Re:|Subject:)/
  const reSalut = /^\s*(Dear |To Whom It May Concern)/
  const reEnc = /^\s*(Enc[.:]|Enclosure)/i
  const reCc = /^\s*cc:/i
  const rePs = /^\s*P\.?\s?S\.?/
  const reCSZ = /,\s*[A-Z]{2}\s+\d{5}/
  const closings = ['Sincerely yours', 'Yours sincerely', 'Yours faithfully', 'Yours truly', 'Best regards', 'Kind regards', 'With deepest sympathy', 'With sincere apologies', 'With love', 'Love always', 'Sincerely', 'Regards', 'Respectfully', 'Cordially', 'Warmly', 'Best', 'Love']
  const reClosing = new RegExp('^\\s*(' + closings.join('|') + '),?\\s*$', 'i')

  const model = []; let phase = 'pre'; let senderSeen = false; let sigSeen = false
  const role = (role, by, conf, content, extra = {}) => model.push({ role, by, conf, content, ...extra })
  const native = (by, conf, raw) => model.push({ role: null, by, conf, raw })

  for (const node of tree.children) {
    if (node.type === 'yaml') continue
    const raw = sliceOf(src, node)

    if (node.type === 'containerDirective' || node.type === 'leafDirective') {
      role(node.name, 'explicit', 'high', directiveLines(src, node))
      if (node.name === 'salutation') phase = 'body'
      else if (node.name === 'closing' || node.name === 'signature-block') { phase = 'post'; if (node.name === 'signature-block') sigSeen = true }
      continue
    }
    if (node.type === 'list' || node.type === 'code' || node.type === 'blockquote') { native('structural', 'high', raw); continue }
    if (node.type === 'heading') { role('subject', 'structural', 'med', [raw.replace(/^#{1,6}\s+/, '').trim()]); continue }
    if (node.type !== 'paragraph') { native('structural', 'high', raw); continue }

    const lines = linesOf(raw); const first = lines[0]
    if (lines.length === 1 && reDate.test(first)) { role('date', 'pattern', 'high', lines); continue }
    if (reSubject.test(first)) { role('subject', 'pattern', 'high', lines); continue }
    if (reSalut.test(first)) { role('salutation', 'pattern', 'high', lines); phase = 'body'; continue }
    if (reClosing.test(first)) { role('closing', 'pattern', 'high', [first]); if (lines.length > 1) { role('signature-block', 'position', 'med', lines.slice(1)); sigSeen = true } phase = 'post'; continue }
    if (reEnc.test(first)) { role('enclosures', 'pattern', 'high', lines); continue }
    if (reCc.test(first)) { role('cc', 'pattern', 'high', lines); continue }
    if (rePs.test(first)) { role('postscript', 'pattern', 'high', lines); continue }
    if (phase === 'pre') {
      const addrLike = lines.length >= 2 || reCSZ.test(lines.join('\n'))
      if (addrLike) { role(senderSeen ? 'recipient-block' : 'sender-block', 'position', 'med', lines); senderSeen = true; continue }
      native('default', 'low', raw); continue
    }
    if (phase === 'post' && !sigSeen) { role('signature-block', 'position', 'med', lines); sigSeen = true; continue }
    native('structural', 'high', raw)
  }
  return model
}

export function summarize (model, name = '', klass = 'letter') {
  const snip = o => (Array.isArray(o.content) ? o.content.join(' ') : (o.raw || '')).slice(0, 46).replace(/\s+/g, ' ')
  const review = model.filter(o => o.conf !== 'high').length
  let s = `\n  ${name.split('/').pop()}  ·  class=${klass}  ·  ${model.length} blocks  ·  ${review} → review (LLM)\n`
  for (const o of model) s += `  ${o.conf === 'high' ? '  ' : '→ '}${(o.role || 'native').padEnd(16)} ${(o.by + '/' + o.conf).padEnd(16)} ${snip(o)}\n`
  return s
}

// ── CLI ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2]
  if (!file) { console.error('usage: src/assign/assign.js <source.md> [--class letter] [--emit]'); process.exit(2) }
  const klass = process.argv.includes('--class') ? process.argv[process.argv.indexOf('--class') + 1] : 'letter'
  try {
    const { model } = assign(readFileSync(file, 'utf8'), klass)
    console.log(process.argv.includes('--emit') ? modelToCmk(model, klass) : summarize(model, file, klass))
  } catch (e) { console.error('ERROR — ' + e.message); process.exit(1) }
}
