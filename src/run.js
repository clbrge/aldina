// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// Aldina — the OUTPUT flow library: make a document from ChoirMark content + an admitted theme grammar.
// (The LAYOUT flow — designing the grammar — is separate; see ARCHITECTURE.md.) The CLI in src/cli/ and the
// hosted API both call run(); neither owns pipeline logic.
//
// The LLM lives at ONE place — the resolve boundary (loose .md / incomplete .cmk → resolved .cmk). From
// the resolved .cmk onward the render is a deterministic pure function; no model in the render path.
//   resolve: assign → resolve-roles  (LLM)
//   render:  parse → compose → gate → project  (deterministic)

import { PDFDocument, PDFArray, PDFHexString, PDFName, PDFString } from 'pdf-lib'
import { toHtml, frontMatter, PIVOT_CONTRACT_VERSION } from 'choirmark'
import { assign } from './assign/assign.js'
import { modelToCmk } from './emit-cmk.js'
import { compose } from './compose.js'
import { resolveReferences } from './xref.js'
import { validate } from './harness/validate.js'
import { deriveLedger } from './ledger/derive.js'
import { parseMoney } from './ledger/calc.js'
import { PLAIN_EDITION } from './ledger/edition.js'

const SUPPORTED_PIVOT_CONTRACT = 1
if (PIVOT_CONTRACT_VERSION !== SUPPORTED_PIVOT_CONTRACT) throw new Error(`aldina: choirmark pivot contract v${PIVOT_CONTRACT_VERSION} is not supported (engine expects v${SUPPORTED_PIVOT_CONTRACT}) — update the engine for the new pivot contract`)

const parseRate = r => { if (r == null) return undefined; const s = String(r).trim(); return s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s) }
const resolveEdition = (id, editions) => {
  if (!id) return PLAIN_EDITION
  if (!editions[id]) throw new Error(`ledger: unknown edition '${id}' — not provided to the engine`)
  return editions[id]
}

export { frontMatter }

const frontMatterBlock = meta => `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---`

function applyRoles (model, roles) {
  return model.map((b, i) => {
    if (b.conf === 'high') return b
    const role = roles[i]
    if (role === b.role) return b
    if (role === null) {
      const raw = b.raw != null ? b.raw : (Array.isArray(b.content) ? b.content.join('\n') : b.content)
      return { ...b, role: null, raw }
    }
    const content = b.content != null ? b.content : (b.raw != null ? b.raw.split('\n').filter(x => x.trim()) : [])
    return { ...b, role, content }
  })
}

export async function resolveDoc (src, { resolver } = {}) {
  const trace = []
  const t = (stage, note) => trace.push({ stage, note })
  const meta = frontMatter(src)
  let klass = meta.class
  if (!klass) {
    if (!resolver) throw new Error('loose .md declares no class — class inference needs the LLM resolver; add `class:` to the front matter for the deterministic path')
    klass = await resolver.inferClass(src)
    meta.class = klass
    t('infer-class', `LLM → ${klass}`)
  }
  if (klass === 'deck') {
    if (!resolver) throw new Error('loose deck needs the LLM resolver (slide-breaking); add it or pass a resolved .cmk')
    const body = src.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
    const resolvedBody = await resolver.resolveDeck(body)
    t('resolve-roles', 'LLM slide-breaking + deck roles')
    return { cmk: `${frontMatterBlock(meta)}\n\n${resolvedBody}\n`, klass, residual: 0, trace }
  }
  const { model } = assign(src, klass)
  const residual = model.filter(o => o.conf && o.conf !== 'high').length
  t('assign', `${model.length} blocks · ${residual} residual`)
  if (!residual) {
    t('resolve-roles', 'identity (already resolved — no residual to assign)')
    return { cmk: src, klass, residual: 0, trace }
  }
  let resolved = model
  if (resolver) {
    resolved = applyRoles(model, await resolver.assignRoles(model, klass))
    t('resolve-roles', `LLM resolved ${residual} residual`)
  } else {
    t('resolve-roles', `no resolver; ${residual} kept as deterministic guess`)
  }
  return { cmk: modelToCmk(resolved, klass, meta), klass, residual, trace }
}

export async function run (src, { theme = null, themeDirs = [], from = 'cmk', resolver, editions = {}, emitPdf = true, insecure = false } = {}) {
  const trace = []
  const t = (stage, note) => trace.push({ stage, note })

  let cmk = src
  if (from === 'md') { const r = await resolveDoc(src, { resolver }); cmk = r.cmk; trace.push(...r.trace) }

  const meta = frontMatter(cmk)
  const klass = meta.class
  if (!klass) throw new Error('resolved .cmk declares no class — a resolved document must carry `class:` in its front matter')

  let pv = toHtml(cmk)
  if (klass === 'composed') return runComposed(pv, meta, { theme, themeDirs, editions, emitPdf, insecure }, trace, t)
  pv = resolveReferences(pv)
  const edition = resolveEdition(meta.edition, editions); const rate = parseRate(meta.rate); const opening = parseMoney(meta.opening, meta.locale)
  let derived = []
  if (klass === 'ledger') { const d = deriveLedger(pv, { locale: meta.locale, currency: meta.currency, edition, rate, opening }); pv = d.pivot; derived = d.derived }
  t('parse', `${from === 'md' ? 'resolved (from .md)' : 'resolved .cmk'} · ${klass}${meta.format ? ` · ${meta.format}` : ''}`)
  if (derived.length) t('derive', `computed ${derived.join(' + ')}`)

  const forme = compose(pv, klass, theme, themeDirs, meta, insecure)
  t('compose', `forme · ${meta.format || klass}${theme ? ` · theme=${theme}` : ''}`)

  const res = await validate(forme, { locale: meta.locale, edition, rate, opening, emitPdf })
  t('gate', res.passed ? 'PASS' : `FAIL (${res.findings.filter(f => f.status === 'fail').length})`)

  const pdf = emitPdf && res.pdf ? await normalizedPdf(res.pdf, { title: meta.title, lang: meta.lang }) : null
  if (pdf) t('project', 'pdf · printToPDF (gate browser)')

  return { forme, res, pdf, trace, meta, klass }
}

const COMPOSE_VARIANT = { letter: 'continuation', folio: 'report', ledger: 'statement' }

// A segment body may itself hold nested `<section>` (a brief's zones, a deck's slides), so the split is
// depth-aware: a `<section data-class>` at depth 0 opens a segment, its matching close ends it.
export function splitSegments (pv) {
  const tag = /<section\b([^>]*)>|<\/section>/g
  const segs = []
  let depth = 0; let cur = null; let m; let gapStart = 0
  while ((m = tag.exec(pv)) !== null) {
    if (m[0] === '</section>') {
      if (--depth < 0) throw new Error('composed document: unbalanced </section> in pivot')
      if (depth === 0 && cur) { cur.body = pv.slice(cur.start, m.index); segs.push(cur); cur = null; gapStart = tag.lastIndex }
    } else {
      if (depth === 0) {
        const between = pv.slice(gapStart, m.index).trim().slice(0, 60)
        if (between) throw new Error(`composed document: stray content outside a segment — ${between}`)
        const cls = m[1].match(/\bdata-class="([^"]+)"/)
        if (!cls) throw new Error(`composed document: a top-level <section> has no data-class — ${m[0]}`)
        cur = { klass: cls[1], attrs: m[1], start: tag.lastIndex }
      }
      depth++
    }
  }
  if (depth !== 0) throw new Error('composed document: unbalanced <section> in pivot')
  const trailing = pv.slice(gapStart).trim().slice(0, 60)
  if (trailing) throw new Error(`composed document: stray content outside a segment — ${trailing}`)
  return segs
}

async function runComposed (pv, meta, { theme, themeDirs, editions = {}, emitPdf = true, insecure = false }, trace, t) {
  const segs = splitSegments(pv)
  if (!segs.length) throw new Error('composed document has no <section data-class> segments — nothing to compose')
  t('parse', `composed · ${segs.length} segments`)
  const docRate = parseRate(meta.rate); const opening = parseMoney(meta.opening, meta.locale)
  const segments = []
  let pageOffset = 0
  for (const s of segs) {
    const klass = s.klass
    const edition = (s.attrs.match(/data-edition="([^"]*)"/) || [])[1]
    const ed = resolveEdition(edition, editions)
    const rate = parseRate((s.attrs.match(/data-rate="([^"]*)"/) || [])[1]) ?? docRate
    const segMeta = { ...meta, class: klass, 'class-variant': COMPOSE_VARIANT[klass], ...(edition ? { edition } : {}) }
    let content = resolveReferences(s.body.trim())
    if (klass === 'ledger') content = deriveLedger(content, { locale: meta.locale, currency: meta.currency, edition: ed, rate, opening }).pivot
    let forme = compose(content, klass, theme, themeDirs, segMeta, insecure)
    if (emitPdf && pageOffset) forme = withPageStart(forme, pageOffset + 1)
    const res = await validate(forme, { locale: meta.locale, edition: ed, rate, opening, emitPdf })
    let doc = null
    if (emitPdf && res.pdf) { doc = await PDFDocument.load(res.pdf, { updateMetadata: false }); pageOffset += doc.getPageCount() }
    segments.push({ klass, edition, forme, res, doc })
    t('segment', `${klass}${edition ? ` (${edition})` : ''} · ${res.passed ? 'PASS' : 'FAIL'}`)
  }
  const findings = segments.flatMap((s, i) => s.res.findings.map(f => ({ ...f, detail: `seg ${i + 1} ${s.klass}: ${f.detail}` })))
  const res = { passed: segments.every(s => s.res.passed), findings }
  const pdf = emitPdf && res.passed ? await mergeSegments(segments, { title: meta.title, lang: meta.lang }) : null
  if (pdf) t('project', `pdf · ${segments.length} segments merged`)
  return { segments, res, pdf, trace, meta, klass: 'composed' }
}

// Chromium stamps the PDF with the wall-clock CreationDate/ModDate and a per-run Producer/file ID, so
// the same forme renders to different bytes each run. Pin them to fixed values — a resolved .cmk must
// render byte-identical (provenance dates, if ever wanted, belong in a sidecar, not the artifact).
const PDF_DATE = new Date('2001-01-01T00:00:00Z')
const PDF_PRODUCER = 'Aldina'
const PDF_ID = '00000000000000000000000000000000'

function pinMetadata (doc, { title, lang } = {}) {
  doc.setProducer(PDF_PRODUCER)
  doc.setCreator(PDF_PRODUCER)
  doc.setCreationDate(PDF_DATE)
  doc.setModificationDate(PDF_DATE)
  const id = PDFHexString.of(PDF_ID)
  const ids = PDFArray.withContext(doc.context)
  ids.push(id); ids.push(id)
  doc.context.trailerInfo.ID = ids
  if (lang) doc.catalog.set(PDFName.of('Lang'), PDFString.of(lang))
  if (title) doc.setTitle(title, { showInWindowTitleBar: true })
  return doc
}

export const normalizedPdf = async (bytes, info) => (await pinMetadata(await PDFDocument.load(bytes, { updateMetadata: false }), info)).save()

const TITLE_CASE = s => s.charAt(0).toUpperCase() + s.slice(1)

// pdf-lib has no outline API, so the /Outlines tree is assembled by hand (linked First/Last/Prev/Next).
export function addOutlines (doc, items) {
  if (items.length < 2) return
  const ctx = doc.context
  const outlinesRef = ctx.nextRef()
  const refs = items.map(() => ctx.nextRef())
  items.forEach((it, i) => {
    ctx.assign(refs[i], ctx.obj({
      Title: PDFHexString.fromText(it.title),
      Parent: outlinesRef,
      Dest: [it.pageRef, PDFName.of('Fit')],
      ...(i > 0 ? { Prev: refs[i - 1] } : {}),
      ...(i < items.length - 1 ? { Next: refs[i + 1] } : {})
    }))
  })
  ctx.assign(outlinesRef, ctx.obj({ Type: 'Outlines', First: refs[0], Last: refs[refs.length - 1], Count: items.length }))
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef)
}

// Each segment is rendered on its own (segments differ in page geometry), so its `counter(page)` would
// restart at 1. `@page:first { counter-set: page N }` is the one mechanism PagedJS honours to start a
// render's numbering at N, so the merged document numbers continuously across segments.
const withPageStart = (html, n) => html.replace('</head>', `<style>@page:first{ counter-set: page ${n}; }</style></head>`)

async function mergeSegments (segments, info) {
  const merged = await PDFDocument.create({ updateMetadata: false })
  const items = []
  for (const s of segments) {
    if (!s.doc) continue
    const start = merged.getPageCount()
    const pages = await merged.copyPages(s.doc, s.doc.getPageIndices())
    for (const p of pages) merged.addPage(p)
    if (pages.length) items.push({ title: TITLE_CASE(s.klass), pageRef: merged.getPage(start).ref })
  }
  addOutlines(merged, items)
  pinMetadata(merged, info)
  return merged.save()
}
