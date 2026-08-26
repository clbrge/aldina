import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compose } from '../src/compose.js'
import { discoverThemes, BUILTIN } from '../src/cli/themes.js'

test('compose — a theme missing a class/variant grammar fails with a clear message, not raw ENOENT', () => {
  assert.throws(
    () => compose('<p>x</p>', 'folio', 'studio', [], { class: 'folio' }),
    e => /theme 'studio' has no 'folio\.css'/.test(e.message) && !/ENOENT/.test(e.message)
  )
})

test('theme manifests declare class coverage (the preflight oracle)', () => {
  const themes = discoverThemes([BUILTIN])
  const oxford = themes.find(t => t.name === 'oxford')
  const basel = themes.find(t => t.name === 'basel')
  assert.ok(!oxford.classes.includes('ledger'), 'oxford must not claim ledger')
  assert.ok(basel.classes.includes('ledger'), 'basel must cover ledger')
})
