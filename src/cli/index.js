#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina CLI dispatcher. Verbless-primary: a known verb routes to its module; anything else is a
// source path handled by `make`. The hosted API calls run() directly, never through the CLI.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hintsForError } from './hints.js'

const NOT_YET = new Set(['watch', 'transform'])

const TOP_HELP = `aldina — make print-grade documents from ChoirMark + a theme

Usage:
  aldina <source.cmk> [dest]     make a document (the default; run \`aldina --help-make\`… see below)
  aldina resolve <loose.md>      infer class + roles → resolved .cmk (LLM; --no-llm for deterministic)
  aldina themes                  list available themes
  aldina serve                   run the render service (HTTP in, gated PDF out)

Run \`aldina <source.cmk> -h\` for make options. \`--version\` prints the version.`

function version () {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  return pkg.version
}

async function main () {
  const first = process.argv[2]

  if (first === undefined && process.stdin.isTTY) { process.stdout.write(TOP_HELP + '\n'); return 0 }
  if (first === '--version' || first === '-V') { process.stdout.write(version() + '\n'); return 0 }
  if (first === '--help' || first === '-h') { process.stdout.write(TOP_HELP + '\n'); return 0 }

  if (NOT_YET.has(first)) throw new Error(`\`${first}\` is not implemented yet`)

  if (first === 'resolve') {
    const { runResolve } = await import('./resolve.js')
    return runResolve(process.argv.slice(3))
  }

  if (first === 'serve') {
    const { runServe } = await import('./serve.js')
    return runServe(process.argv.slice(3))
  }

  if (first === 'themes') {
    const { runThemes } = await import('./themes.js')
    return runThemes(process.argv.slice(3))
  }

  const { runMake } = await import('./make.js')
  return runMake(process.argv.slice(2))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then(code => process.exit(code))
    .catch(e => {
      process.stderr.write('aldina: ' + e.message + '\n')
      for (const h of hintsForError(e)) process.stderr.write(h + '\n')
      process.exit(2)
    })
}
