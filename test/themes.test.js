// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { discoverThemes } from '../src/cli/themes.js'

const BUILTIN = fileURLToPath(new URL('../themes/', import.meta.url))

test('discoverThemes reads the built-in oxford manifest', () => {
  const themes = discoverThemes([BUILTIN])
  const oxford = themes.find(t => t.name === 'oxford')
  assert.ok(oxford, 'oxford is discovered')
  assert.deepEqual(oxford.classes, ['letter', 'deck'])
})

test('discoverThemes dedupes by name, nearest dir winning', () => {
  const themes = discoverThemes([BUILTIN, BUILTIN])
  assert.equal(themes.filter(t => t.name === 'oxford').length, 1)
})
