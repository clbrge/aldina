import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { loadEditions } from '../src/cli/editions.js'

const FIXTURES = fileURLToPath(new URL('../fixtures', import.meta.url))

test('loadEditions — reads *.json from the search path, keyed by id', () => {
  const ed = loadEditions([join(FIXTURES, 'editions')])
  assert.equal(ed['eu-vat']?.id, 'eu-vat')
  assert.ok(ed['eu-vat'].outputs.total)
})

test('loadEditions — a missing dir is skipped, no path yields an empty map', () => {
  assert.deepEqual(loadEditions([join(FIXTURES, 'no-such-dir')]), {})
  assert.deepEqual(loadEditions(), {})
})
