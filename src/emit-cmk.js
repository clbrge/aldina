// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Serialize a resolved role model → a resolved ChoirMark (.cmk) string, the input the `choirmark`
// package renders to the HTML pivot. This is the border: Aldina's inference produces the model;
// ChoirMark owns model-text → pivot. A block with no role is structural content — emitted verbatim
// as native markdown; only the HTML-less roles become `:::role` blocks.

const CARRY = ['class-variant', 'type', 'format', 'window', 'lang', 'dir', 'title', 'authors', 'locale', 'currency', 'rate', 'edition', 'opening', 'url']

export function modelToCmk (model, klass = 'letter', meta = {}) {
  const fm = ['class: ' + klass]
  for (const k of CARRY) if (meta[k] != null) fm.push(`${k}: ${meta[k]}`)
  const blocks = model.map(o => {
    if (o.role === null) return o.raw
    const content = (Array.isArray(o.content) ? o.content : [o.content]).filter(x => x != null)
    return `:::${o.role}\n${content.join('\\\n')}\n:::`
  })
  return `---\n${fm.join('\n')}\n---\n\n${blocks.join('\n\n')}\n`
}
