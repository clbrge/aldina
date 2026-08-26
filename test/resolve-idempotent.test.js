import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolveDoc } from '../src/run.js'
import { assign } from '../src/assign/assign.js'

const read = p => readFileSync(new URL('../fixtures/' + p, import.meta.url), 'utf8')

test('resolveDoc — a resolved letter round-trips to itself (idempotent)', async () => {
  for (const f of readdirSync(new URL('../fixtures/letters/', import.meta.url)).filter(x => x.startsWith('resolved-'))) {
    const src = read('letters/' + f)
    const r = await resolveDoc(src, {})
    assert.equal(r.residual, 0, f + ' should have no residual')
    assert.equal(r.cmk, src, f + ' should resolve to itself')
  }
})

test('resolveDoc — a resolved brief (with :::zone) round-trips and never throws', async () => {
  const src = read('briefs/resolved-tideline.cmk')
  const r = await resolveDoc(src, {})
  assert.equal(r.cmk, src)
})

test('assign — ChoirMark element/structural roles (figure, table, zone) are valid in any class', () => {
  assert.doesNotThrow(() => assign('---\nclass: folio\n---\n\n:::figure\n![x](img:a)\n:::\n', 'folio'))
  assert.doesNotThrow(() => assign('---\nclass: brief\n---\n\n::::zone{name=main}\n:::feature\nx\n:::\n::::\n', 'brief'))
})

test('assign — a genuinely unknown role for the class still throws', () => {
  assert.throws(() => assign('---\nclass: folio\n---\n\n:::sender-block\nx\n:::\n', 'folio'), /unknown role/)
})
