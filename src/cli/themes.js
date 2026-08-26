// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// `themes` — list the themes available across the search path (CLI dirs → env → config → built-in).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flag, flagVals, parseJsonFlag } from './args.js'

export const BUILTIN = fileURLToPath(new URL('../../themes/', import.meta.url))

function readManifest (dir) {
  const f = join(dir, 'theme.yaml')
  if (!existsSync(f)) return null
  const text = readFileSync(f, 'utf8')
  const get = re => (text.match(re) || [])[1]?.trim()
  const cr = get(/^classes:\s*\[([^\]]*)\]/m)
  return {
    name: get(/^name:\s*(.+)$/m) || basename(dir),
    description: get(/^description:\s*(.+)$/m) || '',
    classes: cr ? cr.split(',').map(s => s.trim()).filter(Boolean) : [],
    dir
  }
}

export function discoverThemes (dirs) {
  const seen = new Set()
  const out = []
  for (const d of dirs) {
    if (!existsSync(d)) continue
    for (const entry of readdirSync(d)) {
      const sub = join(d, entry)
      if (!statSync(sub).isDirectory()) continue
      const man = readManifest(sub)
      if (!man || seen.has(man.name)) continue
      seen.add(man.name)
      out.push(man)
    }
  }
  return out
}

const HELP = `aldina themes — list available themes (across the theme search path)

Usage:
  aldina themes [--theme-dir <dir>]    list themes; --theme-dir repeatable, also ALDINA_THEME_DIR / config

Options:
  --json    machine-readable [{name, description, classes, dir}] to stdout

Output:
  stdout: one theme per line (name [classes] — description), nearest-in-search-path winning a name clash`

export async function runThemes (args) {
  if (flag(args, '-h') || flag(args, '--help')) { process.stdout.write(HELP + '\n'); return 0 }

  const json = parseJsonFlag(args)
  const cliDirs = flagVals(args, '--theme-dir')
  const { loadConfig, resolveThemeDirs } = await import('./config.js')
  const config = loadConfig()
  const dirs = [...resolveThemeDirs(cliDirs, config), BUILTIN]

  const themes = discoverThemes(dirs)
  if (json) { process.stdout.write(JSON.stringify(themes, null, 2) + '\n'); return 0 }
  if (!themes.length) { process.stderr.write('no themes found\n'); return 0 }
  for (const t of themes) {
    process.stdout.write(`${t.name}  [${t.classes.join(', ') || 'no classes'}]${t.description ? '  — ' + t.description : ''}\n`)
  }
  return 0
}
