#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina admission gate — the HARD checks (browser-side; measures the rendered DOM). Library + CLI.
//
// Class-agnostic: fit · contrast · min-font · window-fit. A forme is admissible iff every check
// passes. The only external is the chromium binary — measuring rendered CSS needs a real layout engine.
//   usage:  node src/harness/validate.js <forme.html>   (exit 0 admitted · 1 rejected · 2 error)
//   env:    CHROMIUM=/path/to/chromium

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// ── runs IN THE BROWSER (stringified + injected); appends results as JSON ──
function measure () {
  const lum = rgb => { const a = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2] }
  const parseRGB = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); if (p.length >= 4 && p[3] === 0) return null; return [p[0], p[1], p[2]] }
  const bgOf = el => { let n = el; while (n && n.nodeType === 1) { const b = parseRGB(getComputedStyle(n).backgroundColor); if (b) return b; n = n.parentElement } return [255, 255, 255] }
  const ratio = (f, b) => { const a = Math.max(lum(f), lum(b)), c = Math.min(lum(f), lum(b)); return (a + 0.05) / (c + 0.05) }
  const toPx = v => { v = (v || '').trim(); const n = parseFloat(v); if (v.endsWith('in')) return n * 96; if (v.endsWith('pt')) return n * 96 / 72; if (v.endsWith('mm')) return n * 96 / 25.4; return n }
  const ownText = el => { for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) return true; return false }
  const label = el => el.getAttribute('data-role') || el.getAttribute('data-zone') || el.tagName.toLowerCase()
  const F = []; const add = (check, status, detail) => F.push({ check, status, detail })

  document.querySelectorAll('[data-zone]').forEach(z => {
    const dy = z.scrollHeight - z.clientHeight, dx = z.scrollWidth - z.clientWidth, over = dy > 1 || dx > 1
    add('fit', over ? 'fail' : 'pass', 'zone=' + z.getAttribute('data-zone') + (over ? ' overflows by ' + Math.max(dy, dx) + 'px' : ''))
  })

  const minFont = parseFloat(document.documentElement.getAttribute('data-min-font') || '12')
  const mF = [], cF = []; let mN = 0, cN = 0
  document.querySelectorAll('body *').forEach(el => {
    const t = el.tagName; if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT') return
    if (!ownText(el) || !el.getClientRects().length) return
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize); mN++
    if (fs + 0.5 < minFont) mF.push(fs.toFixed(1) + 'px [' + label(el) + ']')
    const fg = parseRGB(cs.color); if (!fg) return; cN++
    const r = ratio(fg, bgOf(el)), bold = (parseInt(cs.fontWeight) || 400) >= 700
    const floor = (fs >= 24 || (fs >= 18.66 && bold)) ? 3 : 4.5
    if (r + 0.05 < floor) cF.push('ratio ' + r.toFixed(2) + ' under ' + floor + ' [' + label(el) + ']')
  })
  add('min-font', mF.length ? 'fail' : 'pass', mF.length ? mF.length + '/' + mN + ' below ' + minFont + 'px: ' + mF.join(', ') : mN + ' OK')
  add('contrast', cF.length ? 'fail' : 'pass', cF.length ? cF.length + '/' + cN + ' below floor: ' + cF.join(', ') : cN + ' OK')

  const root = getComputedStyle(document.documentElement), wx = root.getPropertyValue('--win-x')
  const rec = document.querySelector('[data-role="recipient-block"]')
  if (wx && rec) {
    const page = rec.closest('.page') || document.body, pr = page.getBoundingClientRect(), rr = rec.getBoundingClientRect()
    const zx = toPx(wx), zy = toPx(root.getPropertyValue('--win-y')), zw = toPx(root.getPropertyValue('--win-w')), zh = toPx(root.getPropertyValue('--win-h'))
    const ox = rr.left - pr.left, oy = rr.top - pr.top
    const ok = ox >= zx - 1 && oy >= zy - 1 && ox + rr.width <= zx + zw + 1 && oy + rr.height <= zy + zh + 1
    add('window-fit', ok ? 'pass' : 'fail', ok ? 'recipient within window zone' : 'recipient outside window zone')
  }

  const pre = document.createElement('pre'); pre.id = 'aldina-results'
  pre.textContent = JSON.stringify({ passed: !F.some(f => f.status === 'fail'), findings: F })
  document.body.appendChild(pre)
}

export function validate (formeHtml) {
  const injected = formeHtml.replace('</body>', `<script>(${measure.toString()})()</script></body>`)
  const tmp = join(mkdtempSync(join(tmpdir(), 'aldina-')), 'forme.html')
  writeFileSync(tmp, injected)
  const chromium = process.env.CHROMIUM || 'chromium'
  const args = ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=6000', '--dump-dom', 'file://' + tmp]
  const dom = execFileSync(chromium, args, { encoding: 'utf8', maxBuffer: 1 << 24, stdio: ['ignore', 'pipe', 'ignore'] })
  const m = dom.match(/<pre id="aldina-results">(.*?)<\/pre>/)
  if (!m) throw new Error('validator did not run')
  return JSON.parse(m[1])
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
    const res = validate(readFileSync(file, 'utf8'))
    console.log(reportText(res, basename(file)))
    process.exit(res.passed ? 0 : 1)
  } catch (e) { console.error('harness: ' + e.message); process.exit(2) }
}
