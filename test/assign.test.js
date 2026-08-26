// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { toHtml } from 'choirmark'
import { assign } from '../src/assign/assign.js'
import { modelToCmk } from '../src/emit-cmk.js'

const fixture = name => readFileSync(fileURLToPath(new URL(`../fixtures/letters/${name}`, import.meta.url)), 'utf8')

test('assign infers the letter envelope from a loose .md', () => {
  const { model } = assign(fixture('01-business-termination.md'), 'letter')
  const roles = model.map(o => o.role)
  assert.deepEqual(roles.slice(0, 5), ['sender-block', 'date', 'recipient-block', 'subject', 'salutation'])
  assert.ok(roles.includes('closing'))
  assert.ok(roles.includes('signature-block'))
  assert.ok(roles.includes('enclosures'))
})

test('structural content carries no role (emitted as native markdown)', () => {
  const { model } = assign(fixture('01-business-termination.md'), 'letter')
  const list = model.find(o => o.role === null && /^[-*+]\s/.test(o.raw || ''))
  assert.ok(list, 'the in-body list is a roleless native block')
  assert.ok(!model.some(o => o.role === 'list' || o.role === 'body-paragraph'))
})

test('the model round-trips through ChoirMark to a role-tagged pivot', () => {
  const { model } = assign(fixture('01-business-termination.md'), 'letter')
  const pivot = toHtml(modelToCmk(model, 'letter'))
  assert.match(pivot, /<div data-role="date" dir="auto">June 25, 2026<\/div>/)
  assert.match(pivot, /<div data-role="sender-block" dir="auto">/)
  assert.match(pivot, /<ul>\s*<li>/)
})

test('an unknown explicit role is a loud error', () => {
  assert.throws(() => assign('---\nclass: letter\n---\n\n:::nonsense\nx\n:::\n', 'letter'), /unknown role/)
})
