#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Gate adversarial probe — synthetic formes that target the gate's known blind spots, run through
// validate(). Expectations are printed alongside the actual verdict so a regression is obvious.
//   usage:  node scripts/probe-gate.js
//   env:    CHROMIUM=/path/to/chromium  (else 'chromium' on PATH)

import { validate } from '../src/harness/validate.js'

const forme = body => `<!doctype html><html data-min-font="12"><head><style>
@page{size:8.5in 11in;margin:0}
.page{width:8.5in;height:11in;position:relative;overflow:visible;color:#111;font:16px/1.4 serif}
</style></head><body>${body}<span id="doc-end"></span></body></html>`

const cases = [
  {
    name: 'off-page fixed text',
    expect: 'REJECT (bounds: entirely off the page)',
    html: forme('<div class="page"><p>Readable body copy that sits on the page as intended.</p>' +
      '<p style="position:fixed;left:20in;top:1in">SECRET PULLED OFF THE PAGE</p></div>')
  },
  {
    name: 'low-opacity (alpha) text on dark',
    expect: 'REJECT (contrast: alpha composited, ratio collapses)',
    html: forme('<div class="page" style="background:#000;color:#fff">' +
      '<p style="color:rgba(255,255,255,0.2)">barely-there low-opacity text</p></div>')
  },
  {
    name: 'overlapping absolute text',
    expect: 'KNOWN GAP — still admitted (overlap detection not implemented)',
    html: forme('<div class="page">' +
      '<p style="position:absolute;left:1in;top:1in">AAAAAAAAAA</p>' +
      '<p style="position:absolute;left:1in;top:1in">BBBBBBBBBB</p></div>')
  },
  {
    name: 'unresolved cross-reference',
    expect: 'REJECT (reference: dangling ref renders ?)',
    html: forme('<div class="page"><p>see figure <a href="#fig:missing" data-role="cross-reference">?</a></p></div>')
  },
  {
    name: 'clean control (should pass)',
    expect: 'ADMIT',
    html: forme('<div class="page"><p>A perfectly ordinary, readable paragraph on a white page.</p></div>')
  }
]

for (const c of cases) {
  const res = await validate(c.html)
  console.log(`\n${res.passed ? 'ADMIT ' : 'REJECT'}  ${c.name}`)
  console.log(`        expect: ${c.expect}`)
  for (const f of res.findings) if (f.status === 'fail') console.log(`        ✗ ${f.check}: ${f.detail}`)
}
console.log('')
