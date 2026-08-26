// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Edition contract — a jurisdiction/locale pack the engine deliberately does not own. An edition is
// declarative data (never code), so a third-party edition can only express the closed calc subset and
// stays safe and checkable. The engine evaluates the graph; deriving/checking tax is the edition's,
// not the engine's. See ARCHITECTURE.md.

// Default edition for un-editioned ledgers. discount/tax are signed adjustment rows here, so a
// reduction is authored negative; a jurisdiction wanting magnitude discounts ships its own edition.
export const PLAIN_EDITION = { id: 'plain', rounding: 'half-up', outputs: { total: ['+', 'subtotal', 'discount', 'tax'] } }

export function roundCents (x, mode = 'half-up') {
  if (mode === 'half-even') {
    const f = Math.floor(x); const d = x - f
    if (d < 0.5) return f
    if (d > 0.5) return f + 1
    return f % 2 === 0 ? f : f + 1
  }
  return Math.round(x)
}

const OPS = {
  '+': vals => vals.reduce((a, b) => a + b, 0),
  '-': vals => vals.reduce((a, b) => a - b),
  '−': vals => vals.reduce((a, b) => a - b),
  '*': vals => vals.reduce((a, b) => a * b, 1),
  '×': vals => vals.reduce((a, b) => a * b, 1)
}

export function evaluate (edition, inputs) {
  const base = { ...inputs }
  const ev = (expr, scope) => {
    if (typeof expr === 'number') return expr
    if (typeof expr === 'string') {
      if (expr in scope) return scope[expr]
      const n = Number(expr)
      if (!Number.isNaN(n)) return n
      throw new Error(`edition '${edition.id}': unknown input '${expr}'`)
    }
    const [op, ...args] = expr
    if (op === 'sum') { const r = scope[args[0]] || []; return r.reduce((a, b) => a + b, 0) }
    if (op === 'sum-lines') {
      const lines = scope.lines || []; const rates = scope.lineRates || []
      let s = 0
      for (let i = 0; i < lines.length; i++) s += ev(args[0], { ...scope, lineAmount: lines[i], lineRate: rates[i] })
      return s
    }
    if (op === 'round') return roundCents(ev(args[0], scope), edition.rounding)
    if (!OPS[op]) throw new Error(`edition '${edition.id}': unknown op '${op}'`)
    return OPS[op](args.map(a => ev(a, scope)))
  }
  const out = {}
  for (const role of Object.keys(edition.outputs || {})) {
    base[role] = ev(edition.outputs[role], base)
    out[role] = base[role]
  }
  return out
}
