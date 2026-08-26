#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina admission gate — the HARD checks (browser-side; measures the rendered DOM). Library + CLI.
//
// Class-agnostic: one validator runs on every class. A forme is admissible iff every
// check passes. Drives a system Chromium over CDP (chromium.js); a `data-paged` forme is paginated by
// pagedjs first, then measured per page. Measuring rendered CSS needs a real layout engine.
//   usage:  node src/harness/validate.js <forme.html>   (exit 0 admitted · 1 rejected · 2 error)
//   env:    CHROMIUM=/path/to/chromium (required) · ALDINA_NO_SANDBOX=1 to disable the sandbox

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './chromium.js'
import { reconcile } from '../ledger/calc.js'
import { unresolvedRefs } from '../xref.js'

// ── runs IN THE BROWSER (stringified + page.evaluate'd); returns the results object ──
/* global getComputedStyle */
function measure (paged) {
  const lum = rgb => { const a = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2] }
  const parseRGBA = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return [p[0] || 0, p[1] || 0, p[2] || 0, p.length >= 4 ? p[3] : 1] }
  const over = (f, b) => { const a = f[3]; return [a * f[0] + (1 - a) * b[0], a * f[1] + (1 - a) * b[1], a * f[2] + (1 - a) * b[2]] }
  const bgOf = el => { const layers = []; let n = el; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const b = parseRGBA(cs.backgroundColor); if (b && b[3] > 0) layers.push(b); n = n.parentElement } let acc = [255, 255, 255]; for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc); return acc }
  const ratio = (f, b) => { const a = Math.max(lum(f), lum(b)); const c = Math.min(lum(f), lum(b)); return (a + 0.05) / (c + 0.05) }
  const toPx = v => { v = (v || '').trim(); const n = parseFloat(v); if (v.endsWith('in')) return n * 96; if (v.endsWith('pt')) return n * 96 / 72; if (v.endsWith('mm')) return n * 96 / 25.4; return n }
  const ownText = el => { for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) return true; return false }
  const scaleOf = el => { let s = 1; let n = el; while (n && n.nodeType === 1) { const t = getComputedStyle(n).transform; const m = t && t.match(/matrix\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(parseFloat); s *= Math.min(Math.hypot(p[0], p[1]), Math.hypot(p[2], p[3])) } n = n.parentElement } return s }
  const label = el => el.getAttribute('data-role') || el.getAttribute('data-zone') || el.tagName.toLowerCase()
  const F = []; const add = (check, status, detail) => F.push({ check, status, detail })

  document.querySelectorAll('[data-zone]').forEach(z => {
    const dy = z.scrollHeight - z.clientHeight; const dx = z.scrollWidth - z.clientWidth; const over = dy > 1 || dx > 1
    add('fit', over ? 'fail' : 'pass', 'zone=' + z.getAttribute('data-zone') + (over ? ' overflows by ' + Math.max(dy, dx) + 'px' : ''))
  })

  if (paged) {
    const pages = document.querySelectorAll('.pagedjs_page_content')
    pages.forEach((p, i) => {
      const dy = p.scrollHeight - p.clientHeight
      // Layout widths only (scrollWidth/clientWidth): pagedjs applies a preview transform that distorts
      // getBoundingClientRect on a page, so the bounding rect is not a reliable overflow signal. A
      // painting element overflows when its content is wider than its own box or wider than the page.
      let hx = 0; let culprit = ''
      p.querySelectorAll('*').forEach(el => {
        if (el.id === 'doc-end') return
        const paints = /^(IMG|TABLE|PRE|FIGURE|SVG|CANVAS|HR)$/.test(el.tagName) || ownText(el)
        if (!paints || !el.getClientRects().length) return
        const v = Math.max(el.scrollWidth - el.clientWidth, el.scrollWidth - p.clientWidth)
        if (v > hx) { hx = v; culprit = `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''} sw=${el.scrollWidth} cw=${el.clientWidth} page=${p.clientWidth}` }
      })
      const tall = dy > 1; const wide = hx > 1
      add('fit', tall || wide ? 'fail' : 'pass', 'page ' + (i + 1) + (tall ? ' content overflows by ' + Math.round(dy) + 'px (element too tall to paginate)' : wide ? ' content overflows by ' + Math.round(hx) + 'px wide — ' + culprit : ' contained'))
    })
    if (!pages.length) add('fit', 'fail', 'no paginated pages rendered')
    const end = document.querySelector('.pagedjs_pages #doc-end')
    add('complete', end ? 'pass' : 'fail', end ? 'all content paginated' : 'content dropped — an element too tall to paginate halted the flow')
  } else {
    document.querySelectorAll('.page, body > section').forEach(p => {
      const dy = p.scrollHeight - p.clientHeight; const dx = p.scrollWidth - p.clientWidth; const over = dy > 1 || dx > 1
      add('fit', over ? 'fail' : 'pass', (p.className.split(' ')[0] || p.tagName.toLowerCase()) + (over ? ' overflows the page by ' + Math.max(dy, dx) + 'px (content would clip/drop)' : ' contained'))
    })
  }

  if (!paged) {
    document.querySelectorAll('body *').forEach(el => {
      if (el.id === 'doc-end' || !el.getClientRects().length) return
      const cs = getComputedStyle(el)
      const clipY = /hidden|clip/.test(cs.overflowY); const clipX = /hidden|clip/.test(cs.overflowX)
      if (!clipY && !clipX) return
      const dy = clipY ? el.scrollHeight - el.clientHeight : 0; const dx = clipX ? el.scrollWidth - el.clientWidth : 0
      if (dy > 1 || dx > 1) add('fit', 'fail', 'clipped ' + label(el) + ' — ' + Math.max(dy, dx) + 'px of content hidden')
    })
  }

  const pageSel = paged ? '.pagedjs_page_content' : '.page, body > section'
  const offPage = []
  document.querySelectorAll('body *').forEach(el => {
    if (el.id === 'doc-end' || !el.getClientRects().length) return
    if (!(/^(IMG|TABLE|PRE|FIGURE|SVG|CANVAS|HR)$/.test(el.tagName) || ownText(el))) return
    const page = el.closest(pageSel); if (!page) return
    const pr = page.getBoundingClientRect(); const q = el.getBoundingClientRect()
    if ((!q.width && !q.height) || (!pr.width && !pr.height)) return
    if (q.right <= pr.left || q.left >= pr.right || q.bottom <= pr.top || q.top >= pr.bottom) offPage.push(label(el))
  })
  if (offPage.length) add('fit', 'fail', offPage.length + ' element(s) rendered entirely off the page: ' + offPage.slice(0, 5).join(', '))

  const minFont = parseFloat(document.documentElement.getAttribute('data-min-font') || '12')
  const mF = []; const cF = []; let mN = 0; let cN = 0
  document.querySelectorAll('body *').forEach(el => {
    const t = el.tagName; if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT' || el.id === 'doc-end') return
    if (!ownText(el) || !el.getClientRects().length) return
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize) * scaleOf(el); mN++
    if (fs + 0.5 < minFont) mF.push(fs.toFixed(1) + 'px [' + label(el) + ']')
    const fg = parseRGBA(cs.color); if (!fg || fg[3] === 0) return; cN++
    const bg = bgOf(el)
    if (!bg) { cF.push('unverifiable background (gradient/image) [' + label(el) + ']'); return }
    const r = ratio(over(fg, bg), bg); const bold = (parseInt(cs.fontWeight) || 400) >= 700
    const floor = (fs >= 24 || (fs >= 18.66 && bold)) ? 3 : 4.5
    if (r + 0.05 < floor) cF.push('ratio ' + r.toFixed(2) + ' under ' + floor + ' [' + label(el) + ']')
  })
  add('min-font', mF.length ? 'fail' : 'pass', mF.length ? mF.length + '/' + mN + ' below ' + minFont + 'px: ' + mF.join(', ') : mN + ' OK')
  add('contrast', cF.length ? 'fail' : 'pass', cF.length ? cF.length + '/' + cN + ' below floor: ' + cF.join(', ') : cN + ' OK')

  const root = getComputedStyle(document.documentElement); const wx = root.getPropertyValue('--win-x')
  const rec = document.querySelector('[data-role="recipient-block"]')
  if (wx && rec) {
    const page = rec.closest('.page') || document.body; const pr = page.getBoundingClientRect()
    const zx = toPx(wx); const zy = toPx(root.getPropertyValue('--win-y')); const zw = toPx(root.getPropertyValue('--win-w')); const zh = toPx(root.getPropertyValue('--win-h'))
    const rects = [rec.getBoundingClientRect(), ...[...rec.querySelectorAll('*')].flatMap(e => [...e.getClientRects()])]
    let l = Infinity; let t = Infinity; let r = -Infinity; let b = -Infinity
    for (const q of rects) { if (!q.width && !q.height) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom) }
    const ok = (l - pr.left) >= zx - 1 && (t - pr.top) >= zy - 1 && (r - pr.left) <= zx + zw + 1 && (b - pr.top) <= zy + zh + 1
    add('window-fit', ok ? 'pass' : 'fail', ok ? 'recipient ink within window zone' : 'recipient ink outside window zone')
  }

  return { passed: !F.some(f => f.status === 'fail'), findings: F }
}

/* global document */
function extractLedger () {
  const tables = document.querySelectorAll('[data-role="line-items"]')
  if (!tables.length) return null
  let cols = null
  const rows = []
  tables.forEach(t => {
    cols = cols || t.getAttribute('data-cols')
    t.querySelectorAll('tbody tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.textContent)
      if (cells.length) rows.push(cells)
    })
  })
  const slot = r => { const e = document.querySelector('[data-role="' + r + '"]'); return e ? e.textContent : null }
  return { cols, rows, subtotal: slot('subtotal'), discount: slot('discount'), tax: slot('tax'), total: slot('total') }
}

const PAGEDJS = fileURLToPath(new URL('../../node_modules/pagedjs/dist/paged.polyfill.js', import.meta.url))
const PAGEDJS_SOURCE = readFileSync(PAGEDJS, 'utf8')

export const allowRequest = url => /^(data|about|blob):/.test(url)

function finalize (res, ledger, formeHtml, { locale, edition, rate, opening }, pdf) {
  if (ledger) {
    const rec = reconcile(ledger, { locale, edition, rate, opening })
    res.findings.push({ check: 'reconcile', status: rec.ok ? 'pass' : 'fail', detail: rec.ok ? `${rec.counted} line items reconcile` : rec.problems.join('; ') })
    if (!rec.ok) res.passed = false
  }
  const unresolved = unresolvedRefs(formeHtml)
  if (unresolved.length) {
    res.findings.push({ check: 'reference', status: 'fail', detail: `${unresolved.length} unresolved reference(s): ${unresolved.map(u => u.ref).slice(0, 5).join(', ')}` })
    res.passed = false
  }
  if (pdf) res.pdf = pdf
  return res
}

async function rtEval (cx, expression, { returnByValue = false, awaitPromise = false, label = 'evaluate' } = {}) {
  let res
  try {
    res = await cx.send('Runtime.evaluate', { expression, returnByValue, awaitPromise })
  } catch (e) {
    throw new Error(/timed out/.test(e.message) ? `gate: ${label} did not settle (timed out)` : e.message)
  }
  if (res.exceptionDetails) throw new Error(`gate: ${label} failed — ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`)
  return returnByValue ? res.result.value : res.result
}

export async function validate (formeHtml, { locale = 'en-US', edition = null, rate, opening, emitPdf = false } = {}) {
  const paged = /<html[^>]*\bdata-paged\b/.test(formeHtml)
  const cx = await launch({ sandbox: process.env.ALDINA_NO_SANDBOX !== '1' })
  const blockedNet = []
  try {
    await cx.send('Page.enable')
    await cx.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
    cx.on('Fetch.requestPaused', p => {
      const url = p.request.url
      if (allowRequest(url)) { cx.send('Fetch.continueRequest', { requestId: p.requestId }); return }
      if (/^(https?|ftp|wss?|file):/i.test(url)) blockedNet.push(url)
      cx.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'Aborted' })
    })
    const { frameTree } = await cx.send('Page.getFrameTree')
    await cx.send('Page.setDocumentContent', { frameId: frameTree.frame.id, html: formeHtml })
    await rtEval(cx, 'new Promise(r=>{let done=false;const fin=()=>{if(!done){done=true;r()}};const s=()=>Promise.resolve(document.fonts&&document.fonts.ready).then(fin,fin);document.readyState==="complete"?s():addEventListener("load",s,{once:true});setTimeout(fin,5000)})', { awaitPromise: true, label: 'page load' })
    if (paged) {
      await rtEval(cx, 'window.PagedConfig={auto:false}')
      await rtEval(cx, PAGEDJS_SOURCE, { label: 'load pagedjs' })
      await rtEval(cx, 'window.PagedPolyfill.preview()', { awaitPromise: true, label: 'pagedjs pagination' })
    }
    const res = await rtEval(cx, `(${measure.toString()})(${paged})`, { returnByValue: true, label: 'measure' })
    const ledger = await rtEval(cx, `(${extractLedger.toString()})()`, { returnByValue: true, label: 'extract ledger' })
    if (blockedNet.length) {
      res.findings.push({ check: 'resource', status: 'fail', detail: `blocked external resource(s) — themes and documents must be self-contained: ${[...new Set(blockedNet)].slice(0, 3).join(', ')}` })
      res.passed = false
    }
    let pdf = null
    if (emitPdf) { const { data } = await cx.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true }); pdf = Buffer.from(data, 'base64') }
    return finalize(res, ledger, formeHtml, { locale, edition, rate, opening }, pdf)
  } finally {
    cx.close()
  }
}

export function reportText (res, name) {
  const by = {}
  for (const f of res.findings) (by[f.check] ??= { pass: 0, fail: 0 })[f.status]++
  let s = `\n  ${name}\n  ${res.passed ? 'PASS  (admitted)' : 'FAIL  (rejected)'}\n`
  for (const c of Object.keys(by).sort()) s += `    ${c.padEnd(11)} ${by[c].pass} pass${by[c].fail ? `  ·  ${by[c].fail} FAIL` : ''}\n`
  for (const f of res.findings) if (f.status === 'fail') s += `    ✗ ${f.check}: ${f.detail}\n`
  return s
}

// ── CLI ──
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2]
  if (!file) { console.error('usage: src/harness/validate.js <forme.html>'); process.exit(2) }
  try {
    const res = await validate(readFileSync(file, 'utf8'))
    console.log(reportText(res, basename(file)))
    process.exit(res.passed ? 0 : 1)
  } catch (e) { console.error('harness: ' + e.message); process.exit(2) }
}
