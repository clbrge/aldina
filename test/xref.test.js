import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveReferences, unresolvedRefs } from '../src/xref.js'

test('resolveReferences — cross-references get the target ordinal (figure/section/table)', () => {
  const pv = [
    '<h1 id="sec:intro">Intro</h1>',
    '<figure id="fig:a"><img src="x"></figure>',
    '<h1 id="sec:methods">Methods</h1>',
    '<figure id="fig:b"><img src="y"></figure>',
    '<p>see <a href="#fig:b" data-role="cross-reference"></a> and <a href="#sec:methods" data-role="cross-reference"></a></p>'
  ].join('')
  const out = resolveReferences(pv)
  assert.match(out, /href="#fig:b" data-role="cross-reference">2<\/a>/)
  assert.match(out, /href="#sec:methods" data-role="cross-reference">2<\/a>/)
})

test('resolveReferences — citations number by first appearance', () => {
  const pv = '<a href="#ref-b" data-role="citation" data-key="b"></a><a href="#ref-a" data-role="citation" data-key="a"></a><a href="#ref-b" data-role="citation" data-key="b"></a>'
  const out = resolveReferences(pv)
  const nums = [...out.matchAll(/data-key="([^"]*)"[^>]*>(\d+)</g)].map(m => `${m[1]}=${m[2]}`)
  assert.deepEqual(nums, ['b=1', 'a=2', 'b=1'])
})

test('resolveReferences — a dangling reference renders a visible ? (no silent blank)', () => {
  const out = resolveReferences('<a href="#fig:missing" data-role="cross-reference"></a>')
  assert.match(out, />\?<\/a>/)
})

test('resolveReferences — leaves a document with no reference anchors unchanged', () => {
  const pv = '<article class="page"><p>plain <a href="https://x.example">link</a></p></article>'
  assert.equal(resolveReferences(pv), pv)
})

test('unresolvedRefs — flags a dangling cross-reference produced by resolveReferences', () => {
  const out = unresolvedRefs(resolveReferences('<a href="#fig:missing" data-role="cross-reference"></a>'))
  assert.deepEqual(out, [{ role: 'cross-reference', ref: 'fig:missing' }])
})

test('unresolvedRefs — detects a dangling citation sentinel by its key', () => {
  assert.deepEqual(unresolvedRefs('<a data-role="citation" data-key="x">?</a>'), [{ role: 'citation', ref: 'x' }])
})

test('unresolvedRefs — a resolved document and a literal prose ? are clean', () => {
  const resolved = resolveReferences('<figure id="fig:a"><img src="x"></figure><a href="#fig:a" data-role="cross-reference"></a>')
  assert.deepEqual(unresolvedRefs(resolved), [])
  assert.deepEqual(unresolvedRefs('<p>Ready? Yes.</p>'), [])
})
