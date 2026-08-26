import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { compose, cssBreaksOut } from '../src/compose.js'

function tmpTheme (letterCss) {
  const root = mkdtempSync(join(tmpdir(), 'aldina-theme-'))
  mkdirSync(join(root, 'evil'))
  writeFileSync(join(root, 'evil', 'tokens.css'), ':root{--ink:#111}')
  writeFileSync(join(root, 'evil', 'letter.css'), letterCss)
  return root
}

const BREAKOUT = '.page{color:#111}\n</style><script>document.title="pwned"</script><style>'

test('compose — front-matter title/authors are HTML-escaped (no markup injection)', () => {
  const out = compose('<p>body</p>', 'folio', 'basel', [], {
    class: 'folio',
    title: '<img src="http://127.0.0.1/x">',
    authors: 'A</h1><script>alert(1)</script>'
  })
  assert.ok(!/<img src="http/.test(out), 'raw <img> must not appear')
  assert.ok(!/<script>alert/.test(out), 'raw <script> must not appear')
  assert.match(out, /&lt;img src=&quot;http/)
})

test('compose — front-matter attribute values cannot break out of the attribute', () => {
  const out = compose('<p>body</p>', 'folio', 'basel', [], { class: 'folio', lang: 'en"><script>bad' })
  assert.ok(!/<script>bad/.test(out), 'attribute breakout must be escaped')
  assert.match(out, /lang="en&quot;&gt;/)
})

test('compose — ordinary front-matter values pass through unchanged', () => {
  const out = compose('<p>body</p>', 'brief', 'basel', [], { class: 'brief', format: 'us-letter', lang: 'ar', dir: 'rtl' })
  assert.match(out, /data-format="us-letter"/)
  assert.match(out, /lang="ar"/)
  assert.match(out, /dir="rtl"/)
})

test('cssBreaksOut — true only for a style-closing sequence', () => {
  assert.equal(cssBreaksOut('.a{color:red}'), false)
  assert.equal(cssBreaksOut('a::before{content:"x"}'), false)
  assert.equal(cssBreaksOut('}</style><script>evil()</script><style>'), true)
  assert.equal(cssBreaksOut('}</STYLE >'), true)
})

test('compose — refuses theme CSS that breaks out of the style block by default', () => {
  const root = tmpTheme(BREAKOUT)
  assert.throws(() => compose('<p>hi</p>', 'letter', 'evil', [root], { class: 'letter' }), /Refused/)
})

test('compose — --insecure lifts the breakout check (own theme, own risk)', () => {
  const root = tmpTheme(BREAKOUT)
  const out = compose('<p>hi</p>', 'letter', 'evil', [root], { class: 'letter' }, true)
  assert.match(out, /<script>document\.title="pwned"<\/script>/)
})
