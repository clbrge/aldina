import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument, PDFName } from 'pdf-lib'
import { addOutlines } from '../src/run.js'

async function withOutline (titles) {
  const doc = await PDFDocument.create({ updateMetadata: false })
  const items = titles.map(t => ({ title: t, pageRef: doc.addPage([200, 200]).ref }))
  addOutlines(doc, items)
  return PDFDocument.load(await doc.save(), { updateMetadata: false })
}

test('addOutlines — merged document gets one bookmark per segment, in order', async () => {
  const re = await withOutline(['Letter', 'Folio', 'Ledger'])
  const outlines = re.catalog.lookup(PDFName.of('Outlines'))
  assert.ok(outlines, 'catalog has /Outlines')
  assert.equal(outlines.lookup(PDFName.of('Count')).asNumber(), 3)
  const titles = []
  let node = outlines.lookup(PDFName.of('First'))
  while (node) {
    titles.push(node.lookup(PDFName.of('Title')).decodeText())
    assert.ok(node.lookup(PDFName.of('Dest')), 'each bookmark has a destination')
    const next = node.get(PDFName.of('Next'))
    node = next ? re.context.lookup(next) : null
  }
  assert.deepEqual(titles, ['Letter', 'Folio', 'Ledger'])
})

test('addOutlines — a single-segment merge gets no outline (nothing to navigate)', async () => {
  const re = await withOutline(['Letter'])
  assert.equal(re.catalog.lookup(PDFName.of('Outlines')), undefined)
})
