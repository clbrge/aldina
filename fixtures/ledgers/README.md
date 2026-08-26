# Ledger fixtures (English)

The **ledger** class — itemized financial instruments: invoices, statements, receipts,
quotes, credit notes, payslips, expense reports, commercial invoices. The class earns its
slot by introducing a primitive *no other class has*: **arithmetic that must reconcile.**

Where folios added *relational* checks (cross-refs resolve, numbering is consistent) and
letters/decks had only *local* checks (does this zone overflow), ledgers add a third,
**numeric-relational** family: totals are derived from line items and must equal them.
This is the purest expression of the gate's "**validate the output**" claim — a ledger is
either correct or it isn't, and the check is deterministic, with zero LLM judgment.

> **Scope:** the `ledger` class is **tabular and arithmetic** — repeating line items that
> roll up into derived totals, with fiscal/legal apparatus. A letter *about* money (a
> payment demand, `../letters/08`) is **not** a ledger — it's prose that mentions amounts.
> A ledger *is* the financial instrument; the numbers are structured and must compute.

## Convention (extends letters/decks/folios)

- **Front-matter = fixture annotation only** — `type`, `format` (paper or `thermal-80mm`),
  `length`, `currency` (`single` / `multi`), `tone`, `stresses`, `lang`. Plus the
  ledger-specific field:
  - **`recon:`** — the arithmetic identities this fixture exercises (e.g. `total = subtotal
    + tax`). This is the gate's checklist for the fixture, written in plain English. It is
    bookkeeping, never rendered — the analogue of the deck's `slides` hint.
- **Body = the instrument as loose markdown.** Party blocks (biller / bill-to), document
  meta (number, dates, terms), the line-item table, the totals stack, and any
  terms/declaration — all as natural text and markdown tables. Roles are **not** tagged;
  the engine infers them. **All numbers are written so they reconcile** — the fixtures are
  the ground truth the harness checks generated output against.

## Index

| # | file | type | format | currency | exercises |
|---|------|------|--------|----------|-----------|
| 01 | services-invoice | invoice | us-letter | single | qty × rate; % discount; tax on discounted base; net-30 terms |
| 02 | account-statement | statement | a4 | single | running opening→closing balance; mixed debits/credits; aging buckets |
| 03 | receipt | receipt | thermal-80mm | single | the **small extreme**; tendered/change; minimal apparatus |
| 04 | quote-estimate | quote | us-letter | single | not-yet-charged; validity window; **optional line excluded** from total |
| 05 | credit-note | credit-note | a4 | single | **negative amounts**; reference to original invoice; tax adjustment |
| 06 | payslip | payslip | a4 | single | **two-axis numbers** (period + YTD); gross − deductions = net |
| 07 | expense-report | expense-report | us-letter | multi | **per-line currency conversion**; categories; mileage; advance offset |
| 08 | commercial-invoice | commercial-invoice | a4 | multi | the **dense/legal extreme**; HS codes; incoterms; CIF; weights & packages |

## Emerging ledger roles

party-block (biller / bill-to / consignee) · document-meta (number · issue-date · due-date ·
terms) · **line-item** (description · qty · unit · amount) · line-group / category ·
**subtotal** · **discount** · **tax-block** · **adjustment** · **total / amount-due** ·
balance (opening / closing) · **aging-bucket** · running-balance column · payment-terms ·
remittance-block · status-stamp (paid / overdue) · currency · **conversion-rate** ·
weights-and-packages · legal-declaration · cross-document reference (credit note → invoice)

## The watch — generic vs ledger-specific

**Shared (the cross-class core holds):**
- ChoirMark → roles → constraints → forme; markdown-hint floor; front-matter annotation; tokens.
- **party-block** ≈ letter sender/recipient; **document-meta** ≈ letter `reference-fields`
  (your-ref / invoice-no — captured as "emerging" in `../letters/README.md`, realized here).
- **table** (shared since decks) — but used as the *structural spine*, not an inline figure.

**Ledger-new — and qualitatively different from anything before:**
- **Arithmetic reconciliation = a new VALIDATOR family.** Folio relational checks are
  *symbolic* (does `[@fig:2]` resolve). Ledger checks are *numeric*: `subtotal = Σ items`,
  `total = subtotal − discount + tax`, `closing = opening + Σ txns`, `net = gross − Σ
  deductions`, `converted = amount × rate`. Deterministic, total, no judgment — the
  cleanest "validate the output" the gate offers.
- **Derived numbers, not derived structure.** Folios derive *structure* (TOC, numbering)
  from content. Ledgers derive *values* (totals) from values. Same "computed, never
  hand-authored" principle, applied to money — and the author must never type a total the
  line items don't support.
- **The line-item table as a new placement primitive.** Not letter flow, not deck zones,
  not folio floats: a table that **paginates carrying a running subtotal**, repeats column
  headers on continuation, and reserves the totals stack for the final page ("continued…"
  on the others). A long invoice/statement is the first content that flows *and* must keep
  a numeric invariant across the page break.
- **Money/locale formatting** — currency symbol, thousands/decimal separators, negative
  conventions (−$x vs ($x)) — a derivation the theme/locale owns, not the author.

**Ledger-only (absent elsewhere):** the reconcile invariant itself; multi-currency
conversion; fiscal/legal apparatus (tax IDs, HS codes, incoterms, declarations).

## Open questions (do NOT decide yet)

1. **Where the totals are authored vs derived.** Fixtures hand-write reconciling totals as
   ground truth, but in production the author should supply *line items only* and the engine
   should *derive and typeset* the totals. Drawing that line is the core ledger design task
   — the money analogue of the folio "labels authored, numbers derived" split.
2. **Reconciliation tolerance & rounding.** Per-line vs total rounding, banker's rounding,
   tax-on-discounted-base vs line-level tax — the gate needs a defined rounding model before
   "the numbers reconcile" is a hard check rather than a flaky one.
3. **Is the carried-subtotal table its own placement mode**, or an extension of the folio
   float/flow machinery? (Mirrors the open folio question about floats.)
4. **Locale as a constraint family.** Currency, date, and number formatting are
   locale-driven and theme-owned; does `ledger` need a `locale` constraint family the other
   classes don't?
