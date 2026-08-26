import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument, PDFName } from 'pdf-lib'
import { normalizedPdf } from '../src/run.js'

async function pdfWith (date, producer) {
  const doc = await PDFDocument.create()
  doc.addPage([200, 200])
  doc.setProducer(producer)
  doc.setCreationDate(date)
  doc.setModificationDate(date)
  return doc.save({ updateMetadata: false })
}

test('normalizedPdf — same content, different date/producer stamps → identical bytes', async () => {
  const a = await normalizedPdf(await pdfWith(new Date('2020-05-05T10:00:00Z'), 'ChromeAAA'))
  const b = await normalizedPdf(await pdfWith(new Date('2024-09-09T22:00:00Z'), 'ChromeBBB'))
  assert.deepEqual(Buffer.from(a), Buffer.from(b))
})

test('normalizedPdf — pins producer, creation date, and modification date', async () => {
  const out = await normalizedPdf(await pdfWith(new Date('2020-05-05T10:00:00Z'), 'ChromeAAA'))
  const doc = await PDFDocument.load(out, { updateMetadata: false })
  const pinned = new Date('2001-01-01T00:00:00Z').toISOString()
  assert.equal(doc.getProducer(), 'Aldina')
  assert.equal(doc.getCreationDate().toISOString(), pinned)
  assert.equal(doc.getModificationDate().toISOString(), pinned)
})

test('normalizedPdf — PDF/UA metadata: title, catalog language, and display-title preference', async () => {
  const out = await normalizedPdf(await pdfWith(new Date('2020-05-05T10:00:00Z'), 'ChromeAAA'), { title: 'My Doc', lang: 'ar' })
  const doc = await PDFDocument.load(out, { updateMetadata: false })
  assert.equal(doc.getTitle(), 'My Doc')
  assert.match(doc.catalog.lookup(PDFName.of('Lang')).toString(), /ar/)
  const vp = doc.catalog.lookup(PDFName.of('ViewerPreferences'))
  assert.equal(vp.get(PDFName.of('DisplayDocTitle')).toString(), 'true')
})
