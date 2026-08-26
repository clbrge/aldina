// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveDoc } from '../src/run.js'

const loose = `---
class: letter
format: us-letter
lang: en
---

Jane A. Whitfield
Akron, OH 44310

June 25, 2026

Dear Mr. Chen,

We are terminating the agreement.

Sincerely,

Jane A. Whitfield
`

test('resolveDoc emits a resolved .cmk carrying class + front-matter, with role blocks', async () => {
  const { cmk, klass } = await resolveDoc(loose)
  assert.equal(klass, 'letter')
  assert.match(cmk, /^---\nclass: letter\nformat: us-letter\nlang: en\n---/)
  assert.match(cmk, /:::date\nJune 25, 2026\n:::/)
  assert.match(cmk, /:::salutation\nDear Mr\. Chen,\n:::/)
  assert.match(cmk, /We are terminating the agreement\./)
})

test('resolveDoc resolves a loose deck via the LLM resolver — front matter kept, body parses', async () => {
  const looseDeck = `---
class: deck
format: 16:9
---

Polaris makes cycling effortless. 240,000 active riders.
`
  const resolver = {
    resolveDeck: async () => '::kicker[Intro]\n\n# Polaris makes cycling effortless\n\n---\n\n:::stat\n240,000\n:::\n\nActive riders'
  }
  const { cmk, klass } = await resolveDoc(looseDeck, { resolver })
  assert.equal(klass, 'deck')
  assert.match(cmk, /^---\nclass: deck\nformat: 16:9\n---/)
  assert.match(cmk, /:::stat\n240,000\n:::/)
  const { toHtml } = await import('choirmark')
  const html = await toHtml(cmk)
  assert.match(html, /data-role="stat"/)
})

test('a loose deck with no resolver is a loud error', async () => {
  await assert.rejects(() => resolveDoc('---\nclass: deck\n---\n\nHello deck.\n'), /loose deck needs the LLM resolver/)
})

test('a class-less loose .md without a resolver is a loud error', async () => {
  await assert.rejects(() => resolveDoc('Dear Sir,\n\nHello.\n'), /declares no class/)
})

test('an injected resolver supplies the class and overrides residual roles', async () => {
  const resolver = {
    inferClass: async () => 'letter',
    assignRoles: async blocks => blocks.map((b, i) => (i === 0 ? 'recipient-block' : b.role))
  }
  const classless = 'Acme Corp\n1 Main St\n\nHello there.\n'
  const { cmk, klass } = await resolveDoc(classless, { resolver })
  assert.equal(klass, 'letter')
  assert.match(cmk, /:::recipient-block\nAcme Corp/)
})
