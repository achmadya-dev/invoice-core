import { describe, expect, it } from 'vitest'
import { invoiceDocument } from '../../src/modules/invoice/document'
import {
  backupFilename,
  contrastRatio,
  deriveInvoicePalette,
  duplicateInvoice,
  formatBytes,
  formatMoney,
  formatRate,
  hasPositiveDecimal,
  invoiceTotals,
  maxCompanies,
  newCompany,
  newInvoice,
  newItem,
  newWorkspace,
  sanitizeFilename,
  saveCompany,
  saveInvoice,
  type Invoice,
} from '../../src/modules/invoice/domain/invoice'
import { decodeWorkspace } from '../../src/modules/invoice/workspace.browser'

const now = new Date('2026-10-12T12:00:00.000Z')

function filledDraft(patch: Partial<Invoice> = {}) {
  const workspace = newWorkspace()
  const company = newCompany('Example Studio')
  const draft = newInvoice(company, [], now)
  return {
    workspace: { ...workspace, companies: [company] },
    draft: {
      ...draft,
      client: { ...draft.client, name: 'Example Client' },
      items: [{ ...newItem('Work'), quantity: '2', rate: '45' }],
      ...patch,
    },
  }
}

describe('invoice money', () => {
  it('rounds each line, discounts before applying tax, and adds shipping last', () => {
    const { draft } = filledDraft({
      items: [
        { ...newItem('A'), rate: '1.005' },
        { ...newItem('B'), rate: '2.005' },
      ],
      discount: '10',
      taxRate: '25',
      shipping: '0.35',
    })
    expect(invoiceTotals(draft)).toEqual({
      lines: [101n, 201n],
      subtotal: 302n,
      discount: 30n,
      tax: 68n,
      shipping: 35n,
      total: 375n,
    })
  })

  it('honors currency precision without losing digits on large values', () => {
    const { draft } = filledDraft({ items: [{ ...newItem('A'), quantity: '2', rate: '0.505' }] })
    expect(invoiceTotals({ ...draft, currency: 'JPY' })?.total).toBe(1n)
    expect(invoiceTotals({ ...draft, currency: 'KWD' })?.total).toBe(1010n)
    expect(formatRate('0.505', 'JPY')).toBe('0.505')
    expect(formatMoney(123456789123456789n, 'USD')).toBe('$1,234,567,891,234,567.89')
    expect(formatMoney(-1n, 'USD')).toBe('-$0.01')
  })

  it('caps a fixed discount, allows credit quantities, and rejects invalid amounts', () => {
    const { draft } = filledDraft({ discountKind: 'fixed', discount: '100' })
    expect(invoiceTotals(draft)?.total).toBe(0n)
    const items = [{ ...newItem('Credit'), quantity: '-1', rate: '1.005' }]
    expect(invoiceTotals({ ...draft, items })?.total).toBe(-101n)
    expect(invoiceTotals({ ...draft, shipping: '-1' })).toBeNull()
    expect(invoiceTotals({ ...draft, taxRate: '100.001' })).toBeNull()
    expect(invoiceTotals({ ...draft, items: [{ ...newItem('Bad rate'), rate: '1e3' }] })).toBeNull()
  })
})

describe('local invoice workspace', () => {
  it('reserves auto numbers once, rejects collisions, and duplicates as a new draft', () => {
    const { workspace, draft } = filledDraft()
    const first = saveInvoice(workspace, draft, now)
    if (!first.ok) throw new Error(first.message)
    expect(first.data.companies[0]?.nextNumber).toBe(2)
    const [original] = first.data.invoices
    if (!original) throw new Error('Expected a saved invoice')
    const edited = saveInvoice(first.data, original, now)
    if (!edited.ok) throw new Error(edited.message)
    expect(edited.data.companies[0]?.nextNumber).toBe(2)
    expect(edited.data.invoices).toHaveLength(1)
    const duplicate = duplicateInvoice(original, first.data.companies[0], first.data.invoices, now)
    expect(duplicate.number).toBe('INV-0002')
    expect(duplicate.status).toBe('draft')
    expect(duplicate.items[0]?.id).not.toBe(original.items[0]?.id)
    expect(saveInvoice(first.data, { ...duplicate, number: ' inv-0001 ' }, now)).toMatchObject({
      ok: false,
    })
  })

  it('normalizes leading spaces in a suggested number without removing its separator', () => {
    const { workspace, draft } = filledDraft({ number: 'Studio 0001' })
    const companies = workspace.companies.map((company) => ({ ...company, prefix: '  Studio ' }))
    const result = saveInvoice({ ...workspace, companies }, draft, now)
    if (!result.ok) throw new Error(result.message)
    expect(result.data.companies[0]?.nextNumber).toBe(2)
  })

  it('validates saved invoices and rejects remote logos and draft fields in current backups', () => {
    const { workspace, draft } = filledDraft()
    const invalid = { ...draft, discount: 'abc' }
    expect(saveInvoice(workspace, invalid, now)).toMatchObject({ ok: false })
    expect(decodeWorkspace(JSON.stringify({ ...workspace, draft }))).toBeNull()
    expect(decodeWorkspace('{}')).toBeNull()
    expect(decodeWorkspace('not json')).toBeNull()
    expect(decodeWorkspace(JSON.stringify({ ...workspace, version: 5 }))).toBeNull()
    expect(decodeWorkspace(JSON.stringify({ ...workspace, invoices: [invalid] }))).toBeNull()
    const remote = {
      ...draft,
      sender: { ...draft.sender, logo: 'https://example.invalid/logo.png' },
    }
    expect(saveInvoice(workspace, remote, now)).toMatchObject({ ok: false })
    expect(decodeWorkspace(JSON.stringify({ ...workspace, invoices: [remote] }))).toBeNull()
    expect(
      decodeWorkspace(
        JSON.stringify({
          ...workspace,
          companies: [...workspace.companies, ...workspace.companies],
        }),
      ),
    ).toBeNull()
  })

  it('refuses an invoice with reversed dates or missing items', () => {
    const { draft, workspace } = filledDraft({ issueDate: '2026-10-12', dueDate: '2026-10-11' })
    expect(saveInvoice(workspace, draft, now)).toMatchObject({
      ok: false,
      message: 'The due date must not precede the issue date.',
    })
    expect(saveInvoice(workspace, { ...draft, dueDate: '', items: [] }, now)).toMatchObject({
      ok: false,
    })
  })

  it('keeps legacy status in saved records and formats byte counts', () => {
    const { workspace, draft } = filledDraft({ status: 'paid', theme: 'emerald' })
    const saved = saveInvoice(workspace, draft, now)
    if (!saved.ok) throw new Error(saved.message)
    const decoded = decodeWorkspace(JSON.stringify(saved.data))
    expect(decoded?.invoices[0]?.status).toBe('paid')
    expect(decoded?.invoices[0]?.theme).toBe('emerald')

    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2560)).toBe('2.5 KB')
    expect(formatBytes(1_572_864)).toBe('1.50 MB')
  })

  it('validates and enforces capacity limits when saving companies', () => {
    const workspace = newWorkspace()
    const studio = newCompany('Northline Studio')
    const created = saveCompany(workspace, studio)
    if (!created.ok) throw new Error(created.message)
    expect(created.data.companies).toEqual([studio])

    const updated = saveCompany(created.data, { ...studio, prefix: 'NL-' })
    if (!updated.ok) throw new Error(updated.message)
    expect(updated.data.companies).toEqual([{ ...studio, prefix: 'NL-' }])

    expect(
      saveCompany(workspace, { ...studio, sender: { ...studio.sender, name: ' ' } }),
    ).toMatchObject({
      ok: false,
    })
    expect(saveCompany(workspace, { ...studio, taxRate: '101' })).toMatchObject({ ok: false })
    expect(saveCompany(workspace, { ...studio, taxRate: '-1' })).toMatchObject({ ok: false })
    expect(saveCompany(workspace, { ...studio, padding: 9 })).toMatchObject({ ok: false })
    expect(
      saveCompany(workspace, {
        ...studio,
        sender: { ...studio.sender, logo: 'https://example.invalid/logo.png' },
      }),
    ).toMatchObject({ ok: false })

    const atCapacity = {
      ...workspace,
      companies: Array.from({ length: maxCompanies }, (_, index) =>
        newCompany(`Studio ${index + 1}`),
      ),
    }
    expect(saveCompany(atCapacity, newCompany('Overflow Studio'))).toMatchObject({
      ok: false,
      message: 'Remove a company before saving a new one.',
    })
    const existing = atCapacity.companies[0]
    if (!existing) throw new Error('Expected a seeded company')
    expect(saveCompany(atCapacity, { ...existing, prefix: 'EDIT-' })).toMatchObject({ ok: true })
  })

  it('rejects forged logo signatures, control/BiDi characters, and oversized UTF-8 backups', () => {
    const { workspace, draft } = filledDraft()
    for (const badLogo of [
      'data:image/png;base64,AAAA',
      'data:image/jpeg;base64,AAAA',
      'DATA:IMAGE/PNG;BASE64,iVBORw0KGgoAAAANSUhEUg==',
    ]) {
      const forged = { ...draft, sender: { ...draft.sender, logo: badLogo } }
      expect(saveInvoice(workspace, forged, now)).toMatchObject({ ok: false })
      expect(decodeWorkspace(JSON.stringify({ ...workspace, invoices: [forged] }))).toBeNull()
    }

    const validPrefix = {
      ...draft,
      sender: { ...draft.sender, logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' },
    }
    expect(
      decodeWorkspace(JSON.stringify({ ...workspace, invoices: [validPrefix] })),
    ).not.toBeNull()

    for (const badClient of ['Evil\u202EClient', 'Null\u0000Byte', 'Tab\tName']) {
      const badInvoice = { ...draft, client: { ...draft.client, name: badClient } }
      expect(saveInvoice(workspace, badInvoice, now)).toMatchObject({ ok: false })
      expect(decodeWorkspace(JSON.stringify({ ...workspace, invoices: [badInvoice] }))).toBeNull()
    }

    const badNotes = { ...draft, notes: 'Hidden\u2066override' }
    expect(saveInvoice(workspace, badNotes, now)).toMatchObject({ ok: false })
    expect(decodeWorkspace(JSON.stringify({ ...workspace, invoices: [badNotes] }))).toBeNull()

    const multilineNotes = { ...draft, notes: 'Line 1\r\nLine 2\tNote' }
    expect(saveInvoice(workspace, multilineNotes, now)).toMatchObject({ ok: true })

    const multiByteRaw =
      '{"version":4,"companies":[],"invoices":[],"products":[],"theme":"system","pad":"' +
      '€'.repeat(3_000_000) +
      '"}'
    expect(decodeWorkspace(multiByteRaw)).toBeNull()
  })

  it('sanitizes filenames, checks positive decimals, enforces palette contrast, and exposes document totals', () => {
    expect(sanitizeFilename('INV-001 / 2026')).toBe('INV-001-2026')
    expect(sanitizeFilename('..')).toBe('invoice')
    expect(sanitizeFilename('.')).toBe('invoice')
    expect(sanitizeFilename('---..---')).toBe('invoice')
    expect(sanitizeFilename('  Café #1.pdf  ')).toBe('Café-1.pdf')
    expect(sanitizeFilename(`${'a'.repeat(99)}.-b`)).toBe('a'.repeat(99))
    expect(backupFilename(new Date(2026, 10, 28, 12, 0))).toBe(
      'invoice-core-backup-2026-11-28.json',
    )

    expect(hasPositiveDecimal('')).toBe(false)
    expect(hasPositiveDecimal('0')).toBe(false)
    expect(hasPositiveDecimal('-1')).toBe(false)
    expect(hasPositiveDecimal('abc')).toBe(false)
    expect(hasPositiveDecimal('0.001')).toBe(true)

    expect(deriveInvoicePalette('#4837a6').accent).toBe('#4837a6')
    expect(deriveInvoicePalette('#047857').accent).toBe('#047857')
    for (const lightHex of ['#ffff00', '#ffffff', '#f9e080', '#a7f3d0']) {
      const palette = deriveInvoicePalette(lightHex)
      expect(contrastRatio(palette.accent, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(palette.amountInk, palette.amountBg)).toBeGreaterThanOrEqual(4.5)
    }

    const { draft } = filledDraft()
    expect(invoiceDocument(draft).totals).toEqual(invoiceTotals(draft))
  })
})
