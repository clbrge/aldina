// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Christophe Le Bars
// The LLM resolver for the resolve-roles checkpoint, built on mohdel. Injected into resolveDoc so the
// core stays deterministic and offline-testable; this is the one place an API call happens.

import mohdel, { silent } from 'mohdel'
import { vocabularies } from 'choirmark'

const CLASSES = ['letter', 'folio', 'deck', 'ledger', 'brief']

function parseJson (output, what) {
  const m = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!m) throw new Error(`resolver: ${what} — model did not return JSON`)
  try {
    return JSON.parse(m[0])
  } catch (e) {
    throw new Error(`resolver: ${what} — unparseable JSON from model: ${e.message}`)
  }
}

const snippet = b => (Array.isArray(b.content) ? b.content.join(' ') : (b.raw || '')).replace(/\s+/g, ' ').slice(0, 160)

export async function makeResolver ({ model = 'openai/gpt-5.4-mini' } = {}) {
  const mo = await mohdel({ logger: silent })
  const m = mo.use(model)

  return {
    async inferClass (src) {
      const prompt = `Classify this document as exactly one of these classes:
- letter: short flowing correspondence — a letter, cover letter, memo, notice.
- folio: long-form, multi-section paginated reading — a report, white paper, research or academic paper, thesis, manual, book. Headings, sections, figures, tables, citations.
- deck: a slide presentation — a sequence of slides shown one at a time.
- ledger: an itemized financial instrument — invoice, statement, receipt, quote (a line-item table that must total).
- brief: a single composed page that must fit on one surface — a one-pager, sell-sheet, fact-sheet, flyer, poster.

Decide by structural shape, not topic. A multi-section paper with figures and references is a folio, never a brief. Reply with only the class name, nothing else.

---
${src.slice(0, 4000)}`
      const { output } = await m.answer(prompt, { outputEffort: 'low' })
      const text = String(output).toLowerCase()
      const klass = CLASSES.find(c => new RegExp(`\\b${c}\\b`).test(text))
      if (!klass) throw new Error(`resolver: class inference returned "${String(output).trim()}" — not one of ${CLASSES.join(', ')}`)
      return klass
    },

    async resolveDeck (body) {
      const prompt = `Convert this loose presentation content into a resolved ChoirMark deck: a sequence of slide containers.

Rules:
- Each slide is a container: ":::slide" … ":::". Use FOUR colons ("::::slide") when the slide contains a block role like ":::stat" or ":::callout" — the outer fence must out-nest the inner one.
- Split into slides by idea — one idea per slide. Where the source uses "---" as a slide break, take it as a boundary; never emit "---" in the output.
- Never put a "type" on a slide. The theme derives each slide's composition from what the slide holds.
- Give a slide a title only when it holds no heading to be known by: ":::slide{title="Traction and revenue"}". Keep it to a few words — it is an outline label, not the headline. A slide that opens with a heading needs no title.
- Within a slide, tag these roles where they apply: kicker (eyebrow label), stat (the big number), callout (a quote/key line), notes (speaker notes). Leave ordinary content native: "#" headings, lists, tables, paragraphs.
- A role is the block form (":::stat" … ":::") or the inline-leaf form ("::kicker[text]").
- Output ONLY the slide containers — no front matter, no commentary, no code fences.

---
${body}`
      const { output } = await m.answer(prompt, { outputEffort: 'low' })
      return String(output).replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '').trim()
    },

    async assignRoles (blocks, klass) {
      const vocab = [...(vocabularies[klass] || [])]
      const listing = blocks.map((b, i) => `${i}: [guess=${b.role || 'native'} conf=${b.conf}] ${snippet(b)}`).join('\n')
      const prompt = `This is a ${klass} document. Each block below has a deterministic role guess; some are low-confidence.
Assign the correct role to every block. Allowed roles: ${vocab.join(', ')}. Use "native" for ordinary body content (paragraphs, lists, quotes) that carries no role.
Return ONLY a JSON array of strings, one role (or "native") per block, in order.

${listing}`
      const { output } = await m.answer(prompt, { outputEffort: 'low' })
      const roles = parseJson(output, 'assignRoles')
      if (!Array.isArray(roles) || roles.length !== blocks.length) throw new Error(`resolver: assignRoles returned ${Array.isArray(roles) ? roles.length : 'non-array'}, expected ${blocks.length} roles`)
      const allowed = new Set([...vocab, 'native'])
      for (const r of roles) if (!allowed.has(r)) throw new Error(`resolver: assignRoles returned unknown role "${r}" for class ${klass}`)
      return roles.map(r => (r === 'native' ? null : r))
    }
  }
}
