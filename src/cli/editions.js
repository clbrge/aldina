// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Load ledger editions (declarative jurisdiction packs) from a search path, keyed by id. The engine
// ships none; a caller — CLI, conformance, or a host — discovers provided ones and hands them to run().

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function loadEditions (dirs = []) {
  const out = {}
  for (const dir of dirs) {
    let files
    try { files = readdirSync(dir) } catch { continue }
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      const ed = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      out[ed.id] = ed
    }
  }
  return out
}
