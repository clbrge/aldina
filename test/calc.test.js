import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMoney, parseQuantity, parsePercent, columnsFromSpec, lineRate, reconcile } from '../src/ledger/calc.js'

const COLS = 'description qty unit-price amount'
const row = (desc, qty, rate, amount) => [desc, qty, rate, amount]

test('parseMoney — US format to integer cents', () => {
  assert.equal(parseMoney('$7,800.00'), 780000)
  assert.equal(parseMoney('$150.00'), 15000)
  assert.equal(parseMoney('$150'), 15000)
  assert.equal(parseMoney('$0.05'), 5)
})

test('parseMoney — negatives (minus, U+2212, parens)', () => {
  assert.equal(parseMoney('-$780.00'), -78000)
  assert.equal(parseMoney('−$780.00'), -78000)
  assert.equal(parseMoney('($780.00)'), -78000)
})

test('parseMoney — EU locale separators', () => {
  assert.equal(parseMoney('1.234,56', 'de-DE'), 123456)
  assert.equal(parseMoney('7.800,00 €', 'de-DE'), 780000)
})

test('parseMoney — blank / missing', () => {
  assert.equal(parseMoney(null), null)
  assert.equal(parseMoney(''), null)
})

test('parseQuantity — number from a cell, unit ignored', () => {
  assert.equal(parseQuantity('1'), 1)
  assert.equal(parseQuantity('12 hrs'), 12)
  assert.equal(parseQuantity('1.5 days'), 1.5)
  assert.equal(parseQuantity(''), null)
})

test('parsePercent — rate cells', () => {
  assert.equal(parsePercent('20%'), 0.2)
  assert.equal(parsePercent('0%'), 0)
  assert.equal(parsePercent('0.2'), 0.2)
  assert.equal(parsePercent(''), null)
})

test('columnsFromSpec — roles by declared position, absent roles are -1', () => {
  const cols = columnsFromSpec('description unit-price tax-rate amount')
  assert.equal(cols.rate, 1)
  assert.equal(cols.taxRate, 2)
  assert.equal(cols.amount, 3)
  assert.equal(cols.qty, -1)
  assert.deepEqual(columnsFromSpec(''), { amount: -1, qty: -1, rate: -1, taxRate: -1, balance: -1 })
})

test('lineRate — cascade: cell overrides the default', () => {
  const cols = { taxRate: 2 }
  assert.equal(lineRate(['x', '$5', '20%', '$100'], cols, 0.1), 0.2)
  assert.equal(lineRate(['x', '$5', '', '$100'], cols, 0.1), 0.1)
  assert.equal(lineRate(['x', '$5', '$100'], { taxRate: -1 }, 0.1), 0.1)
})

test('reconcile — the meridian invoice reconciles exactly (lines + doc)', () => {
  const r = reconcile({
    cols: COLS,
    rows: [
      row('Brand strategy workshop', '1', '$2,400.00', '$2,400.00'),
      row('UX audit', '12 hrs', '$150.00', '$1,800.00'),
      row('Prototype design', '24 hrs', '$150.00', '$3,600.00')
    ],
    subtotal: '$7,800.00',
    discount: '−$780.00',
    tax: '$596.70',
    total: '$7,616.70'
  })
  assert.equal(r.ok, true)
  assert.equal(r.counted, 3)
})

test('reconcile — a line where amount ≠ qty × rate fails at line level', () => {
  const r = reconcile({
    cols: COLS,
    rows: [row('UX audit', '12 hrs', '$150.00', '$1,850.00')]
  })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /line 1: amount/)
})

test('reconcile — no qty/rate columns: line check is skipped (no false fail)', () => {
  const r = reconcile({
    cols: 'date description amount',
    rows: [['Mar 01', 'Document review', '$125.00'], ['Mar 02', 'Strategy session', '$125.00']],
    subtotal: '$250.00',
    total: '$250.00'
  })
  assert.equal(r.ok, true)
})

test('reconcile — rows but no amount column (missing cols) fails, never silently skips', () => {
  const r = reconcile({
    rows: [['a', '$2,400.00'], ['b', '$1,800.00']],
    subtotal: '$9,999.99'
  })
  assert.equal(r.ok, false)
  assert.equal(r.counted, 0)
  assert.match(r.problems[0], /amount column/)
})

test('reconcile — one-cent perturbation of a leaf fails (subtotal)', () => {
  const r = reconcile({
    cols: 'description amount',
    rows: [['a', '$2,400.01'], ['b', '$1,800.00'], ['c', '$3,600.00']],
    subtotal: '$7,800.00',
    total: '$7,800.00'
  })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /subtotal/)
})

test('reconcile — default edition: discount is a signed adjustment (authored negative reduces)', () => {
  const r = reconcile({
    cols: 'description amount',
    rows: [['x', '$100.00']],
    subtotal: '$100.00',
    discount: '−$10.00',
    total: '$90.00'
  })
  assert.equal(r.ok, true)
})

test('reconcile — default edition: discount sign is the edition’s, not calc’s (positive adds)', () => {
  const r = reconcile({
    cols: 'description amount',
    rows: [['x', '$100.00']],
    subtotal: '$100.00',
    discount: '$10.00',
    total: '$110.00'
  })
  assert.equal(r.ok, true)
})

test('reconcile — total ≠ subtotal + adjustments fails', () => {
  const r = reconcile({
    cols: 'description amount',
    rows: [['x', '$100.00']],
    subtotal: '$100.00',
    tax: '$20.00',
    total: '$130.00'
  })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /total/)
})

test('reconcile — exact, no epsilon (half-cent drift fails)', () => {
  const r = reconcile({ cols: 'description amount', rows: [['a', '$0.50'], ['b', '$0.50']], subtotal: '$1.01', total: '$1.01' })
  assert.equal(r.ok, false)
})

test('reconcile — running balance recurrence (from opening) reconciles', () => {
  const r = reconcile({
    cols: 'date description amount balance',
    rows: [['Jun 03', 'Invoice', '$500.00', '$1,500.00'], ['Jun 10', 'Payment', '−$300.00', '$1,200.00']]
  }, { opening: 100000 })
  assert.equal(r.ok, true)
})

test('reconcile — a wrong running balance fails precisely', () => {
  const r = reconcile({
    cols: 'date description amount balance',
    rows: [['Jun 03', 'Invoice', '$500.00', '$1,500.00'], ['Jun 10', 'Payment', '−$300.00', '$1,300.00']]
  }, { opening: 100000 })
  assert.equal(r.ok, false)
  assert.match(r.problems[0], /line 2: balance/)
})

test('reconcile — no rows is not a ledger (empty pass)', () => {
  const r = reconcile({ cols: '', rows: [] })
  assert.equal(r.ok, true)
})
