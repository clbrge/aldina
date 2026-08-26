// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Resolve a folio's cross-references and citations in the engine, deterministically: number figures,
// tables and sections in document order and fill the (empty) anchor ChoirMark emits, so the PDF does
// not depend on CSS target-counter (unsupported by the paged renderer). The theme owns the prefix word
// (Figure/Table/§) and the label counters; the engine owns the number.

function ordinals (html, tag, prefix) {
  const map = {}
  const re = new RegExp('<' + tag + '\\b[^>]*>', 'g')
  let n = 0; let m
  while ((m = re.exec(html)) !== null) {
    n++
    const id = (m[0].match(/\bid="([^"]*)"/) || [])[1]
    if (id && id.startsWith(prefix)) map[id] = n
  }
  return map
}

export function unresolvedRefs (html) {
  const out = []
  for (const m of html.matchAll(/<a ([^>]*?)>\s*\?\s*<\/a>/g)) {
    const attrs = m[1]
    const role = (attrs.match(/data-role="([^"]*)"/) || [])[1]
    if (role !== 'cross-reference' && role !== 'citation') continue
    const ref = (attrs.match(/href="#([^"]*)"/) || [])[1] || (attrs.match(/data-key="([^"]*)"/) || [])[1] || '?'
    out.push({ role, ref })
  }
  return out
}

export function resolveReferences (html) {
  const fig = ordinals(html, 'figure', 'fig:')
  const tbl = ordinals(html, 'table', 'tbl:')
  const sec = ordinals(html, 'h1', 'sec:')
  const cite = {}; let cn = 0
  for (const m of html.matchAll(/data-role="citation"[^>]*\bdata-key="([^"]*)"/g)) {
    if (!(m[1] in cite)) cite[m[1]] = ++cn
  }
  return html.replace(/<a ([^>]*?)>\s*<\/a>/g, (whole, attrs) => {
    const role = (attrs.match(/data-role="([^"]*)"/) || [])[1]
    if (role === 'cross-reference') {
      const ref = (attrs.match(/href="#([^"]*)"/) || [])[1] || ''
      const n = ref.startsWith('fig:') ? fig[ref] : ref.startsWith('tbl:') ? tbl[ref] : ref.startsWith('sec:') ? sec[ref] : undefined
      return `<a ${attrs}>${n != null ? n : '?'}</a>`
    }
    if (role === 'citation') {
      const n = cite[(attrs.match(/data-key="([^"]*)"/) || [])[1]]
      return `<a ${attrs}>${n != null ? n : '?'}</a>`
    }
    return whole
  })
}
