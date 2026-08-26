// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars

import { createServer } from 'node:http'
import { chmod, unlink } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { run } from './run.js'
import { makeResolver } from './cli/resolver.js'

const INTERNAL = /^(chromium|gate):/

const num = (name, fallback) => {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be a positive number, got '${raw}'`)
  return n
}

function settings () {
  return {
    maxSource: num('ALDINA_SERVE_MAX_SOURCE', 20000),
    concurrency: num('ALDINA_SERVE_CONCURRENCY', 2),
    themes: (process.env.ALDINA_SERVE_THEMES || 'leipzig,ulm,siena,parma').split(',').filter(Boolean),
    model: process.env.ALDINA_SERVE_MODEL || 'openai/gpt-5.4-mini'
  }
}

function readBody (request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    request.on('data', chunk => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error(`request body exceeds ${limit} bytes`), { status: 413 }))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function send (response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  })
  response.end(body)
}

function parseRequest (raw, cfg) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw Object.assign(new Error(`body is not JSON — ${e.message}`), { status: 400 })
  }
  const { source, theme, from = 'md' } = parsed || {}
  if (typeof source !== 'string' || !source.trim()) {
    throw Object.assign(new Error('source is required'), { status: 400 })
  }
  if (source.length > cfg.maxSource) {
    throw Object.assign(new Error(`source exceeds ${cfg.maxSource} characters`), { status: 413 })
  }
  if (from !== 'md' && from !== 'cmk') {
    throw Object.assign(new Error("from must be 'md' or 'cmk'"), { status: 400 })
  }
  if (!cfg.themes.includes(theme)) {
    throw Object.assign(new Error(`theme must be one of: ${cfg.themes.join(', ')}`), { status: 400 })
  }
  return { source, theme, from }
}

export function createRenderService ({ logger = console } = {}) {
  const cfg = settings()
  let inFlight = 0
  let resolver = null

  const render = async ({ source, theme, from }) => {
    if (from === 'md' && !resolver) resolver = await makeResolver({ model: cfg.model })
    const { res, pdf, trace, klass } = await run(source, {
      theme,
      from,
      resolver: from === 'md' ? resolver : undefined,
      emitPdf: true
    })
    return {
      admitted: res.passed,
      klass,
      theme,
      findings: res.findings,
      trace,
      pdf: res.passed && pdf ? pdf.toString('base64') : null
    }
  }

  const server = createServer(async (request, response) => {
    const { method, url } = request

    if (method === 'GET' && url === '/health') {
      send(response, 200, { ok: true, themes: cfg.themes, inFlight })
      return
    }

    if (method !== 'POST' || url !== '/render') {
      send(response, 404, { error: 'not found' })
      return
    }

    if (inFlight >= cfg.concurrency) {
      response.setHeader('retry-after', '5')
      send(response, 503, { error: 'the renderer is busy, try again in a moment' })
      return
    }

    inFlight += 1
    const started = Date.now()
    try {
      const req = parseRequest(await readBody(request, cfg.maxSource * 2), cfg)
      const result = await render(req)
      logger.info?.({
        theme: req.theme,
        from: req.from,
        klass: result.klass,
        admitted: result.admitted,
        ms: Date.now() - started
      }, 'render')
      send(response, 200, result)
    } catch (e) {
      if (e.status) {
        send(response, e.status, { error: e.message })
      } else if (INTERNAL.test(e.message)) {
        logger.error?.({ err: e }, 'render failed')
        send(response, 500, { error: 'the renderer failed' })
      } else {
        send(response, 422, { error: e.message })
      }
    } finally {
      inFlight -= 1
    }
  })

  return { server, settings: cfg }
}

export async function listen ({ socket, port, host = '127.0.0.1', logger = console } = {}) {
  const { server, settings: cfg } = createRenderService({ logger })

  if (socket) {
    mkdirSync(dirname(socket), { recursive: true })
    if (existsSync(socket)) await unlink(socket)
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(socket, resolve)
    })
    await chmod(socket, 0o660)
    logger.info?.({ socket, ...cfg }, 'aldina render service listening')
  } else {
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, host, resolve)
    })
    logger.info?.({ host, port, ...cfg }, 'aldina render service listening')
  }

  return server
}
