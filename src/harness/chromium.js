// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Minimal CDP (Chrome DevTools Protocol) client — drives a system Chromium over a WebSocket with no
// npm dependencies (Node's global WebSocket, Node >= 22). The gate's browser plumbing, owned rather
// than vendored.

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/* global WebSocket */

const CDP_TIMEOUT = 30000
const binary = () => process.env.CHROMIUM || 'chromium'

export async function launch ({ sandbox = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'aldina-cdp-'))
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--user-data-dir=${profile}`,
    ...(sandbox ? [] : ['--no-sandbox']),
    'about:blank'
  ]
  const child = spawn(binary(), args, { stdio: ['ignore', 'ignore', 'pipe'] })

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = ''
    const t = setTimeout(() => reject(new Error('chromium: timed out waiting for the DevTools endpoint (is CHROMIUM a headless Chromium?)')), CDP_TIMEOUT)
    child.on('error', e => { clearTimeout(t); reject(new Error(`chromium: failed to launch '${binary()}' — ${e.message} (set CHROMIUM=/path/to/chromium)`)) })
    child.stderr.on('data', d => {
      buf += d
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) { clearTimeout(t); resolve(m[1]) }
    })
  })

  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(new Error('chromium: could not connect to the DevTools WebSocket')) })

  let nextId = 1
  const pending = new Map()
  const listeners = new Map()
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id)
      msg.error ? reject(new Error(`chromium: ${msg.error.message}`)) : resolve(msg.result)
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params, msg.sessionId)
    }
  }

  const rawSend = (method, params, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`chromium: '${method}' timed out`)) }, CDP_TIMEOUT)
    pending.set(id, { resolve: v => { clearTimeout(t); resolve(v) }, reject: e => { clearTimeout(t); reject(e) } })
    ws.send(JSON.stringify({ id, method, params: params || {}, ...(sessionId ? { sessionId } : {}) }))
  })

  const { targetId } = await rawSend('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await rawSend('Target.attachToTarget', { targetId, flatten: true })

  return {
    send: (method, params) => rawSend(method, params, sessionId),
    on: (method, fn) => { const a = listeners.get(method) || []; a.push(fn); listeners.set(method, a) },
    close: () => {
      try { ws.close() } catch {}
      try { child.kill() } catch {}
      try { rmSync(profile, { recursive: true, force: true }) } catch {}
    }
  }
}
