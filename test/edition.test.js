import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, roundCents, PLAIN_EDITION } from '../src/ledger/edition.js'
import { reconcile } from '../src/ledger/calc.js'
import { deriveLedger } from '../src/ledger/derive.js'

const TEST_EDITION = {
  id: 'test-vat',
  rounding: 'half-up',
  outputs: {
    tax: ['round', ['×', 'rate', 'subtotal']],
    total: ['+', 'subtotal', 'tax']
  }
}

test('evaluate — graph over the closed ops', () => {
  assert.deepEqual(evaluate(TEST_EDITION, { subtotal: 10000, rate: 0.2 }), { tax: 2000, total: 12000 })
  assert.deepEqual(evaluate(TEST_EDITION, { subtotal: 10001, rate: 0.2 }), { tax: 2000, total: 12001 })
  assert.equal(evaluate({ id: 's', outputs: { x: ['sum', 'lines'] } }, { lines: [100, 250, 50] }).x, 400)
})

test('evaluate — unknown input is a loud error', () => {
  assert.throws(() => evaluate(TEST_EDITION, { subtotal: 100 }), /unknown input 'rate'/)
})

test('roundCents — half-up vs half-even', () => {
  assert.equal(roundCents(2.5, 'half-up'), 3)
  assert.equal(roundCents(2.5, 'half-even'), 2)
  assert.equal(roundCents(3.5, 'half-even'), 4)
})

test('reconcile — edition-relative: a correct VAT total reconciles', () => {
  const r = reconcile({
    cols: 'description amount',
    rows: [['x', '$100.00']],
    subtotal: '$100.00',
    tax: '$20.00',
    total: '$120.00'
  }, { edition: TEST_EDITION, rate: 0.2 })
  assert.equal(r.ok, true)
})

test('reconcile — edition-relative: a wrong tax fails against the edition', () => {
  const r = reconcile({
    cols: 'description amount',
    rows: [['x', '$100.00']],
    subtotal: '$100.00',
    tax: '$25.00',
    total: '$125.00'
  }, { edition: TEST_EDITION, rate: 0.2 })
  assert.equal(r.ok, false)
  assert.match(r.problems.join(' '), /edition 'test-vat'/)
})

test('deriveLedger — an edition derives tax (and total) from the rate', () => {
  const pivot = '<table data-role="line-items" data-cols="description amount"><thead><tr><th>Desc</th><th>Amount</th></tr></thead><tbody><tr><td>x</td><td>$100.00</td></tr></tbody></table>'
  const { pivot: out, derived } = deriveLedger(pivot, { edition: TEST_EDITION, rate: 0.2 })
  assert.ok(derived.includes('tax'))
  assert.match(out, /data-role="tax"[^>]*>\$20\.00</)
  assert.match(out, /data-role="total"[^>]*>\$120\.00</)
})

const VAT_LINES = {
  id: 'test-vat-lines',
  rounding: 'half-up',
  outputs: {
    tax: ['sum-lines', ['round', ['×', 'lineRate', 'lineAmount']]],
    total: ['+', 'subtotal', 'tax']
  }
}

test('evaluate — per-line (sum-lines) computes mixed-rate tax', () => {
  const out = evaluate(VAT_LINES, { subtotal: 15000, lines: [10000, 5000], lineRates: [0.2, 0] })
  assert.equal(out.tax, 2000)
  assert.equal(out.total, 17000)
})

test('reconcile — mixed-rate invoice via per-line cascade reconciles', () => {
  const r = reconcile({
    cols: 'description tax-rate amount',
    rows: [['Standard goods', '20%', '$100.00'], ['Books', '0%', '$50.00']],
    subtotal: '$150.00',
    tax: '$20.00',
    total: '$170.00'
  }, { edition: VAT_LINES, rate: 0.2 })
  assert.equal(r.ok, true)
})

test('deriveLedger — per-line edition derives mixed-rate tax from the VAT column', () => {
  const pivot = '<table data-role="line-items" data-cols="description tax-rate amount"><thead><tr><th>Desc</th><th>VAT</th><th>Amount</th></tr></thead><tbody>' +
    '<tr><td>Standard goods</td><td>20%</td><td>$100.00</td></tr>' +
    '<tr><td>Books</td><td>0%</td><td>$50.00</td></tr></tbody></table>'
  const { pivot: out, derived } = deriveLedger(pivot, { edition: VAT_LINES, rate: 0.2 })
  assert.ok(derived.includes('tax'))
  assert.match(out, /data-role="tax"[^>]*>\$20\.00</)
  assert.match(out, /data-role="total"[^>]*>\$170\.00</)
})

test('PLAIN_EDITION — default composition: total = subtotal + discount + tax (signed)', () => {
  assert.equal(evaluate(PLAIN_EDITION, { subtotal: 10000, discount: -1000, tax: 2000 }).total, 11000)
  assert.equal(evaluate(PLAIN_EDITION, { subtotal: 10000, discount: 0, tax: 0 }).total, 10000)
})

test('deriveLedger — no edition selected uses the default edition (subtotal + total)', () => {
  const pivot = '<table data-role="line-items" data-cols="description amount"><thead><tr><th>Desc</th><th>Amount</th></tr></thead><tbody><tr><td>x</td><td>$100.00</td></tr></tbody></table>'
  const { derived } = deriveLedger(pivot)
  assert.deepEqual(derived, ['subtotal', 'total'])
})
