// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Ledger calc — jurisdiction-free arithmetic only. Parses authored money strings to integer minor
// units and checks the identities that hold in every jurisdiction: line amount = qty × rate, lines
// sum to the subtotal, running balance. How named roles compose into a total — discount and tax
// included — is the edition's graph, never calc's (see edition.js).

import { evaluate, PLAIN_EDITION } from './edition.js'

const LOCALES = {
  'en-US': { group: ',', decimal: '.' },
  'en-GB': { group: ',', decimal: '.' },
  'de-DE': { group: '.', decimal: ',' },
  'fr-FR': { group: ' ', decimal: ',' }
}

export function parseMoney (raw, locale = 'en-US') {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const { decimal } = LOCALES[locale] || LOCALES['en-US']
  const negative = /[−-]/.test(s) || /\(.*\d.*\)/.test(s)
  const cut = s.lastIndexOf(decimal)
  const intPart = (cut >= 0 ? s.slice(0, cut) : s).replace(/\D/g, '')
  const fracPart = (cut >= 0 ? s.slice(cut + 1) : '').replace(/\D/g, '')
  if (!intPart && !fracPart) return null
  const cents = parseInt(intPart || '0', 10) * 100 + parseInt((fracPart + '00').slice(0, 2), 10)
  return negative ? -cents : cents
}

export function formatCents (cents) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return sign + Math.trunc(abs / 100) + '.' + String(abs % 100).padStart(2, '0')
}

export function formatMoney (cents, { locale = 'en-US', currency = 'USD' } = {}) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}

export function parseQuantity (raw) {
  const m = String(raw == null ? '' : raw).match(/-?\d+(?:[.,]\d+)?/)
  return m ? parseFloat(m[0].replace(',', '.')) : null
}

export function parsePercent (raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  return s.includes('%') ? parseFloat(m[0]) / 100 : parseFloat(m[0])
}

export function columnsFromSpec (cols) {
  const list = String(cols || '').trim().split(/\s+/).filter(Boolean)
  const idx = name => list.indexOf(name)
  return { amount: idx('amount'), qty: idx('qty'), rate: idx('unit-price'), taxRate: idx('tax-rate'), balance: idx('balance') }
}

export function lineRate (cells, cols, defaultRate) {
  if (cols.taxRate >= 0) { const r = parsePercent(cells[cols.taxRate]); if (r != null) return r }
  return defaultRate != null ? defaultRate : 0
}

export function reconcile ({ cols, rows = [], subtotal, discount, tax, total } = {}, { locale = 'en-US', edition = PLAIN_EDITION, rate, opening } = {}) {
  const c = v => parseMoney(v, locale)
  const col = columnsFromSpec(cols)
  const problems = []
  if (rows.length && col.amount < 0) {
    return { ok: false, problems: ['line-items table has no amount column — set data-cols (e.g. "description qty unit-price amount")'], counted: 0 }
  }
  if (col.balance >= 0 && col.amount >= 0) {
    let running = opening != null ? opening : 0
    rows.forEach((cells, i) => {
      const amt = c(cells[col.amount]); if (amt == null) return
      running += amt
      const bal = c(cells[col.balance])
      if (bal != null && bal !== running) problems.push(`line ${i + 1}: balance ${formatCents(bal)} ≠ running balance ${formatCents(running)}`)
    })
  }
  const lineCents = []
  const lineRates = []
  rows.forEach((cells, i) => {
    const amt = col.amount >= 0 ? c(cells[col.amount]) : null
    if (amt == null) return
    lineCents.push(amt)
    if (edition) lineRates.push(lineRate(cells, col, rate))
    if (col.qty >= 0 && col.rate >= 0) {
      const q = parseQuantity(cells[col.qty]); const r = c(cells[col.rate])
      if (q != null && r != null) {
        const expect = Math.round(q * r)
        if (amt !== expect) problems.push(`line ${i + 1}: amount ${formatCents(amt)} ≠ qty × rate ${formatCents(expect)}`)
      }
    }
  })
  const lineSum = lineCents.reduce((a, b) => a + b, 0)
  const sub = c(subtotal); const disc = c(discount); const tx = c(tax); const tot = c(total)
  if (sub != null && lineCents.length && sub !== lineSum) {
    problems.push(`subtotal ${formatCents(sub)} ≠ Σ line items ${formatCents(lineSum)}`)
  }
  const authored = { subtotal: sub, discount: disc, tax: tx, total: tot }
  const computed = evaluate(edition, { subtotal: sub != null ? sub : lineSum, discount: disc || 0, tax: tx, rate, lines: lineCents, lineRates })
  for (const role of Object.keys(computed)) {
    if (authored[role] != null && authored[role] !== computed[role]) {
      problems.push(`${role} ${formatCents(authored[role])} ≠ edition '${edition.id}' ${formatCents(computed[role])}`)
    }
  }
  return { ok: problems.length === 0, problems, counted: lineCents.length }
}
