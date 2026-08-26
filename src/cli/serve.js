// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars

import { listen } from '../serve.js'
import { flag, flagVal } from './args.js'

const HELP = `aldina serve — run the render service (HTTP in, gated PDF out)

Usage:
  aldina serve [--port 4010] [--host 127.0.0.1]
  aldina serve --socket /tmp/cs-ipc/aldina/render.sock

Options:
  --socket <path>   listen on a unix socket (mode 0660) instead of TCP
  --port <n>        TCP port (default 4010)
  --host <addr>     TCP bind address (default 127.0.0.1)

Endpoints:
  GET  /health      { ok, themes, inFlight }
  POST /render      { source, theme, from } -> { admitted, klass, findings, trace, pdf }

Environment:
  ALDINA_SERVE_THEMES        comma-separated allowlist (default leipzig,ulm,siena,parma)
  ALDINA_SERVE_CONCURRENCY   simultaneous renders before 503 (default 2)
  ALDINA_SERVE_MAX_SOURCE    max source characters (default 20000)
  ALDINA_SERVE_MODEL         resolver model (default openai/gpt-5.4-mini)
  CHROMIUM                   path to the chromium binary
  ALDINA_NO_SANDBOX=1        drop the chromium sandbox (containers without the caps)`

export async function runServe (args) {
  if (flag(args, '-h') || flag(args, '--help')) { process.stdout.write(HELP + '\n'); return 0 }

  const socket = flagVal(args, '--socket')
  const port = Number(flagVal(args, '--port') || 4010)
  const host = flagVal(args, '--host') || '127.0.0.1'

  const emit = level => (fields, msg) =>
    process.stdout.write(JSON.stringify({ level, time: Date.now(), ...fields, msg }) + '\n')

  await listen({ socket, port, host, logger: { info: emit(30), error: emit(50) } })

  return new Promise(() => {})
}
