# Letter fixtures (English)

Corpus of structured-content (ChoirMark) inputs spanning letter genres, lengths, and
formats. Two purposes:

1. **Discover the letter role vocabulary** empirically — read the corpus, see what
   structural roles recur (sender block, subject line, enclosures, postscript, …).
2. **Adversarial fixtures** for layout admission tests later — they deliberately span
   the extremes of length, formality, apparatus, and physical format.

> **Scope:** the `letter` class assumes **flowing** content anchored **top** of page.
> Sparse / centered / non-flowing cards (wedding & event invitations) are a **separate
> class** — see `../invitations/`. Don't add them back here.

## Convention

- **Front-matter = fixture annotation only.** `type`, `format`, `length`, `tone`,
  `stresses`, `lang`. Never rendered as letter content; it's our bookkeeping.
- **Body = the letter as loose markdown.** Addresses, date, subject/RE line,
  salutation, paragraphs, closing, signature, enclosures/cc, postscript — all as
  natural text. Roles are **not** tagged; the engine infers them at generation time
  (loose input, hint-not-contract). Address-block line grouping is left to markdown's
  soft-break behavior on purpose — a live illustration of markdown as a *lossy hint*.

This is **not** an authoring UX; it's the fixture format. Real authoring may go looser
(pure prose) or add marks. Front-matter here is test metadata only.

## Index

| # | file | type | format | length | tone | stresses |
|---|------|------|--------|--------|------|----------|
| 01 | business-termination | business | us-letter | medium | formal | full apparatus; in-body list; enclosures; cc |
| 02 | cover-letter | cover-letter | us-letter | medium | formal | contact line; req #; narrative body |
| 03 | condolence | condolence | note-card | very-short | warm | minimal envelope; sensitive prose |
| 04 | resignation | resignation | a4 | short | formal-cordial | dated effective notice; simple apparatus |
| 05 | recommendation | recommendation | us-letter | long | formal-warm | long multi-para; anecdote; "To Whom It May Concern" |
| 06 | complaint | complaint | us-letter | medium | firm | numbered issue list; ref #s; remedy; enclosures |
| 07 | thank-you | thank-you | a5 | very-short | warm | brief; no addresses |
| 08 | payment-demand | payment-demand | a4 | medium | firm-legalistic | amounts; due dates; consequences |
| 09 | personal | personal | a5 | long | casual | long informal prose; no apparatus |
| 10 | sales-outreach | sales-outreach | us-letter | short | persuasive | hook; value prop; CTA; postscript |
| 11 | apology-business | apology-business | us-letter | short-medium | sincere | acknowledgment; remedy; goodwill gesture |

## Emerging roles (extract & refine from the corpus)

sender-block · recipient-block · date (+ place) · subject/RE · salutation · body-paragraph ·
list (bulleted / numbered) · closing · signature-block · enclosures · cc · postscript ·
letterhead (none in this set yet)

From the LaTeX / scrlttr2 cross-check (formal/business; not yet in this corpus — capture later):
- **reference-fields** — your-ref / our-ref / your-message-of / customer-no / invoice-no (labeled band)
- **handling-notation** — REGISTERED / PRIORITY, shown in the window above the address
- **continuation-id** — addressee + date + page-N running line on pages 2+
