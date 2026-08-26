import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitSegments } from '../src/run.js'

test('splitSegments — a segment with nested zone sections keeps its whole body', () => {
  const pv =
    '<section data-class="brief"><section data-zone="masthead"><div data-role="hero">Hi</div></section>' +
    '<section data-zone="main"><div data-role="feature">F1</div></section></section>' +
    '<section data-class="letter"><div data-role="salutation">Dear X,</div></section>'
  const segs = splitSegments(pv)
  assert.equal(segs.length, 2)
  assert.deepEqual(segs.map(s => s.klass), ['brief', 'letter'])
  assert.match(segs[0].body, /data-zone="masthead"/)
  assert.match(segs[0].body, /data-zone="main"/)
  assert.match(segs[0].body, /F1/)
  assert.match(segs[1].body, /Dear X,/)
})

test('splitSegments — segment attributes (edition/rate) read from the opening tag', () => {
  const pv = '<section data-class="ledger" data-edition="eu-vat" data-rate="20%"><table data-role="line-items"></table></section>'
  const segs = splitSegments(pv)
  assert.equal(segs.length, 1)
  assert.match(segs[0].attrs, /data-edition="eu-vat"/)
  assert.match(segs[0].attrs, /data-rate="20%"/)
})

test('splitSegments — a top-level section without a class is malformed', () => {
  assert.throws(() => splitSegments('<section data-zone="x"></section>'), /no data-class/)
})

test('splitSegments — unbalanced sections throw', () => {
  assert.throws(() => splitSegments('<section data-class="letter"><section data-zone="a"></section>'), /unbalanced/)
})

test('splitSegments — stray content before a segment is rejected, not dropped', () => {
  assert.throws(() => splitSegments('<p>loose</p><section data-class="letter"><div data-role="salutation">Hi</div></section>'), /stray content/)
})

test('splitSegments — stray content between segments is rejected', () => {
  const pv = '<section data-class="letter"><p>a</p></section><div data-role="bogus">x</div><section data-class="folio"><p>b</p></section>'
  assert.throws(() => splitSegments(pv), /stray content/)
})

test('splitSegments — stray content after the last segment is rejected', () => {
  assert.throws(() => splitSegments('<section data-class="letter"><p>a</p></section><p>trailing</p>'), /stray content/)
})

test('splitSegments — whitespace between top-level segments is fine', () => {
  const segs = splitSegments('<section data-class="letter"><p>a</p></section>\n  <section data-class="folio"><p>b</p></section>')
  assert.deepEqual(segs.map(s => s.klass), ['letter', 'folio'])
})
