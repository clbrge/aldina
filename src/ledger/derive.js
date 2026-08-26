// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Ledger derive — fill ABSENT cells from the authored leaves. The jurisdiction-free fills are line
// amount (qty × rate), running balance, and subtotal (Σ lines); any further output (total, tax) is
// whatever the edition graph computes. Authored cells are left untouched for the gate to check.

import { parseMoney, parseQuantity, formatMoney, columnsFromSpec, lineRate } from './calc.js'
import { evaluate, PLAIN_EDITION } from './edition.js'

const slotDiv = (role, value) => `<div data-role="${role}" dir="auto">${value}</div>`

function fillLineAmounts (table, cols, locale, currency) {
  let filled = 0
  const out = table.replace(/<tr>([\s\S]*?)<\/tr>/g, whole => {
    const cells = [...whole.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)]
    const amt = cells[cols.amount]
    if (!amt || amt[2].trim() !== '') return whole
    const q = parseQuantity(cells[cols.qty] && cells[cols.qty][2])
    const r = parseMoney(cells[cols.rate] && cells[cols.rate][2], locale)
    if (q == null || r == null) return whole
    filled++
    const cell = `<td${amt[1]}>${formatMoney(Math.round(q * r), { locale, currency })}</td>`
    return whole.slice(0, amt.index) + cell + whole.slice(amt.index + amt[0].length)
  })
  return { table: out, filled }
}

function fillBalances (table, cols, locale, currency, opening) {
  let running = opening != null ? opening : 0
  let filled = 0
  const out = table.replace(/<tr>([\s\S]*?)<\/tr>/g, whole => {
    const cells = [...whole.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)]
    const amtCell = cells[cols.amount]
    if (!amtCell) return whole
    const amt = parseMoney(amtCell[2], locale)
    if (amt == null) return whole
    running += amt
    const balCell = cells[cols.balance]
    if (!balCell || balCell[2].trim() !== '') return whole
    filled++
    const cell = `<td${balCell[1]}>${formatMoney(running, { locale, currency })}</td>`
    return whole.slice(0, balCell.index) + cell + whole.slice(balCell.index + balCell[0].length)
  })
  return { table: out, filled }
}

export function deriveLedger (pivot, { locale = 'en-US', currency = 'USD', edition = PLAIN_EDITION, rate, opening } = {}) {
  const tm = pivot.match(/<table[^>]*data-role="line-items"[\s\S]*?<\/table>/)
  if (!tm) return { pivot, derived: [] }
  const cols = columnsFromSpec((tm[0].match(/data-cols="([^"]*)"/) || [])[1])
  const derived = []

  let table = tm[0]
  if (cols.amount >= 0 && cols.qty >= 0 && cols.rate >= 0) {
    const f = fillLineAmounts(table, cols, locale, currency)
    if (f.filled) { table = f.table; derived.push(`${f.filled} line amount${f.filled > 1 ? 's' : ''}`) }
  }
  if (cols.balance >= 0 && cols.amount >= 0) {
    const fb = fillBalances(table, cols, locale, currency, opening)
    if (fb.filled) { table = fb.table; derived.push(`${fb.filled} balance${fb.filled > 1 ? 's' : ''}`) }
  }
  const out = table === tm[0] ? pivot : pivot.replace(tm[0], table)

  const rows = []
  for (const r of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const tds = [...r[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(m => m[2])
    if (tds.length) rows.push(tds)
  }
  const lineCents = []; const lineRates = []
  if (cols.amount >= 0) {
    for (const cells of rows) {
      const a = parseMoney(cells[cols.amount], locale)
      if (a == null) continue
      lineCents.push(a)
      if (edition) lineRates.push(lineRate(cells, cols, rate))
    }
  }
  const present = role => new RegExp('data-role="' + role + '"').test(out)
  const value = role => { const m = out.match(new RegExp('data-role="' + role + '"[^>]*>([\\s\\S]*?)</')); return m ? m[1] : null }
  const sum = lineCents.reduce((a, b) => a + b, 0)
  const disc = parseMoney(value('discount'), locale) || 0
  const authoredTax = parseMoney(value('tax'), locale)
  const subtotal = present('subtotal') ? parseMoney(value('subtotal'), locale) : (lineCents.length ? sum : null)
  const computed = evaluate(edition, { subtotal: subtotal != null ? subtotal : sum, discount: disc, tax: authoredTax, rate, lines: lineCents, lineRates })

  let inject = ''
  if (cols.balance < 0) {
    if (!present('subtotal') && lineCents.length) {
      inject += slotDiv('subtotal', formatMoney(sum, { locale, currency }))
      derived.push('subtotal')
    }
    for (const role of Object.keys(computed)) {
      if (!present(role)) {
        inject += slotDiv(role, formatMoney(computed[role], { locale, currency }))
        derived.push(role)
      }
    }
  }
  return { pivot: inject ? out + '\n' + inject : out, derived }
}
