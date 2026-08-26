// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// `resolve` — loose .md → an inspectable, editable resolved .cmk (assign + the resolve-roles checkpoint).

import { readFileSync, writeFileSync } from 'node:fs'
import { resolveDoc } from '../run.js'
import { flag, flagVal, parseJsonFlag, readStdin } from './args.js'

const err = s => process.stderr.write(s + '\n')

const HELP = `aldina resolve — loose .md → resolved .cmk (the inference front-end)

Usage:
  aldina resolve <loose.md> [-o doc.cmk]    write the resolved .cmk (default: stdout)
  cat loose.md | aldina resolve             read from stdin

Options:
  -o <path>      write the resolved .cmk to a file instead of stdout
  --model <id>   LLM for class inference / residual roles (default openai/gpt-5.4-mini)
  --no-llm       deterministic only (no API call); class must be declared, residual kept as guesses
  --json         machine-readable {klass, residual, trace} to stdout (no .cmk body)

Output:
  stdout: the resolved .cmk (unless -o)
  stderr: the stage trace
  exit:   0 ok · 2 usage / IO / parse error`

export async function runResolve (args) {
  if (flag(args, '-h') || flag(args, '--help')) { process.stdout.write(HELP + '\n'); return 0 }

  const json = parseJsonFlag(args)
  const out = flagVal(args, '-o')
  const noLlm = flag(args, '--no-llm')
  const llmModel = flagVal(args, '--model') || 'openai/gpt-5.4-mini'
  const positionals = args.filter(a => a === '-' || !a.startsWith('-'))
  const source = positionals[0]
  const stdin = !source || source === '-'
  const src = stdin ? await readStdin() : readFileSync(source, 'utf8')

  let resolver
  if (!noLlm) {
    const { makeResolver } = await import('./resolver.js')
    resolver = await makeResolver({ model: llmModel })
  }

  const { cmk, klass, residual, trace } = await resolveDoc(src, { resolver })
  for (const { stage, note } of trace) err(`    ${stage.padEnd(14)} ${note}`)

  if (json) {
    process.stdout.write(JSON.stringify({ klass, residual, trace }, null, 2) + '\n')
  } else if (out) {
    writeFileSync(out, cmk)
    err(`    resolved       ${out}`)
  } else {
    process.stdout.write(cmk)
  }
  return 0
}
