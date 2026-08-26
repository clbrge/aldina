import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatMoney } from '../src/ledger/calc.js'
import { deriveLedger } from '../src/ledger/derive.js'

test('formatMoney — cents to a localized currency string', () => {
  assert.equal(formatMoney(600000), '$6,000.00')
  assert.equal(formatMoney(654000), '$6,540.00')
  const de = formatMoney(123456, { locale: 'de-DE', currency: 'EUR' })
  assert.ok(de.startsWith('1.234,56'), de)
  assert.ok(/€/.test(de), de)
})

const PIVOT = `<table data-role="line-items" data-cols="description amount"><thead><tr><th>Desc</th><th>Amount</th></tr></thead><tbody>
<tr><td>Design sprint</td><td>$5,000.00</td></tr>
<tr><td>User research</td><td>$1,000.00</td></tr>
</tbody></table>
<div data-role="tax" dir="auto">$540.00</div>`

test('deriveLedger — fills absent subtotal and total from the lines + authored tax', () => {
  const { pivot, derived } = deriveLedger(PIVOT)
  assert.deepEqual(derived, ['subtotal', 'total'])
  assert.match(pivot, /data-role="subtotal"[^>]*>\$6,000\.00</)
  assert.match(pivot, /data-role="total"[^>]*>\$6,540\.00</)
})

test('deriveLedger — authored totals are left untouched (no-op)', () => {
  const full = PIVOT + '<div data-role="subtotal">$6,000.00</div><div data-role="total">$6,540.00</div>'
  const { pivot, derived } = deriveLedger(full)
  assert.deepEqual(derived, [])
  assert.equal(pivot, full)
})

test('deriveLedger — fills an empty line amount from qty × rate', () => {
  const pivot = `<table data-role="line-items" data-cols="description qty unit-price amount"><thead><tr><th>Desc</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>
<tr><td>Consulting</td><td align="right">4 hrs</td><td align="right">$200.00</td><td align="right"></td></tr>
<tr><td>Materials</td><td align="right">1</td><td align="right">$350.00</td><td align="right">$350.00</td></tr>
</tbody></table>`
  const { pivot: out, derived } = deriveLedger(pivot)
  assert.match(out, /<td align="right">\$800\.00<\/td>/)
  assert.ok(derived.includes('1 line amount'))
  assert.match(out, /data-role="subtotal"[^>]*>\$1,150\.00</)
})

test('deriveLedger — fills the running balance from opening + amounts', () => {
  const pivot = `<table data-role="line-items" data-cols="date description amount balance"><thead><tr><th>Date</th><th>Desc</th><th>Amount</th><th>Balance</th></tr></thead><tbody>
<tr><td>Jun 03</td><td>Invoice</td><td align="right">$500.00</td><td align="right"></td></tr>
<tr><td>Jun 10</td><td>Payment</td><td align="right">−$300.00</td><td align="right"></td></tr>
</tbody></table>`
  const { pivot: out, derived } = deriveLedger(pivot, { opening: 100000 })
  assert.ok(derived.includes('2 balances'))
  assert.match(out, /<td align="right">\$1,500\.00<\/td>/)
  assert.match(out, /<td align="right">\$1,200\.00<\/td>/)
})

test('deriveLedger — no line-items table is a no-op', () => {
  const { derived } = deriveLedger('<div data-role="issuer-block">X</div>')
  assert.deepEqual(derived, [])
})
