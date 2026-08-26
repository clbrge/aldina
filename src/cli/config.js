// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// User configuration via env-paths('aldina'): a config.json holding a default theme per class and a
// theme search path. A missing file is a real runtime case (unconfigured user) → {}; a malformed file
// is a loud error, never silently defaulted.

import envPaths from 'env-paths'
import { readFileSync, existsSync } from 'node:fs'
import { join, delimiter } from 'node:path'

export const CONFIG_DIR = envPaths('aldina', { suffix: null }).config
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

export function loadConfig () {
  if (!existsSync(CONFIG_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch (e) {
    throw new Error(`malformed config at ${CONFIG_PATH} — ${e.message}`)
  }
}

export function resolveTheme (cliTheme, klass, config) {
  if (cliTheme) return cliTheme
  if (klass && config.themes && config.themes[klass]) return config.themes[klass]
  if (config.default) return config.default
  return 'oxford'
}

export function resolveThemeDirs (cliDirs, config) {
  const env = (process.env.ALDINA_THEME_DIR || '').split(delimiter).filter(Boolean)
  return [...cliDirs, ...env, ...(config.themeDirs || [])]
}
