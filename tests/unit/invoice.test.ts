import { describe, expect, it } from 'vitest'
import {
  duplicateInvoice,
  formatBytes,
  formatMoney,
  formatRate,
  invoiceTotals,
  newItem,
  newWorkspace,
  saveDraft,
  updateInvoiceStatus,
  type Invoice,
} from '../../src/modules/invoice/domain/invoice'
import { decodeWorkspace } from '../../src/modules/invoice/workspace.browser'

const now = new Date('2026-10-12T12:00:00.000Z')

function filledDraft(patch: Partial<Invoice> = {}) {
  const workspace = newWorkspace()
  return {
    ...workspace,
    dirty: true,
    draft: {
      ...workspace.draft,
      client: { ...workspace.draft.client, name: 'Example Client' },
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
    const first = saveDraft(filledDraft(), now)
    if (!first.ok) throw new Error(first.message)
    expect(first.data.companies[0]?.nextNumber).toBe(2)
    const edited = saveDraft(first.data, now)
    if (!edited.ok) throw new Error(edited.message)
    expect(edited.data.companies[0]?.nextNumber).toBe(2)
    expect(edited.data.invoices).toHaveLength(1)
    const duplicate = duplicateInvoice(
      first.data.draft,
      first.data.companies[0],
      first.data.invoices,
      now,
    )
    expect(duplicate.number).toBe('INV-0002')
    expect(duplicate.status).toBe('draft')
    expect(duplicate.items[0]?.id).not.toBe(first.data.draft.items[0]?.id)
    expect(
      saveDraft({ ...first.data, draft: { ...duplicate, number: ' inv-0001 ' } }, now),
    ).toMatchObject({ ok: false })
  })

  it('normalizes leading spaces in a suggested number without removing its separator', () => {
    const workspace = filledDraft({ number: 'Studio 0001' })
    const companies = workspace.companies.map((company) => ({ ...company, prefix: '  Studio ' }))
    const result = saveDraft({ ...workspace, companies }, now)
    if (!result.ok) throw new Error(result.message)
    expect(result.data.companies[0]?.nextNumber).toBe(2)
  })

  it('validates the entire backup, never accepts remote logos, and keeps incomplete drafts', () => {
    const workspace = filledDraft({ discount: 'abc' })
    expect(saveDraft(workspace, now)).toMatchObject({ ok: false })
    expect(decodeWorkspace(JSON.stringify(workspace))?.draft.discount).toBe('abc')
    expect(decodeWorkspace('{}')).toBeNull()
    expect(decodeWorkspace('not json')).toBeNull()
    expect(decodeWorkspace(JSON.stringify({ ...workspace, version: 2 }))).toBeNull()
    expect(
      decodeWorkspace(JSON.stringify({ ...workspace, invoices: [workspace.draft] })),
    ).toBeNull()
    const draft = {
      ...workspace.draft,
      sender: { ...workspace.draft.sender, logo: 'https://example.invalid/logo.png' },
    }
    expect(decodeWorkspace(JSON.stringify({ ...workspace, draft }))).toBeNull()
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
    const { draft, ...workspace } = filledDraft({ issueDate: '2026-10-12', dueDate: '2026-10-11' })
    expect(saveDraft({ ...workspace, draft }, now)).toMatchObject({
      ok: false,
      message: 'The due date must not precede the issue date.',
    })
    expect(
      saveDraft({ ...workspace, draft: { ...draft, dueDate: '', items: [] } }, now),
    ).toMatchObject({ ok: false })
  })

  it('updates saved invoice status, syncs clean active drafts, and formats byte counts', () => {
    const saved = saveDraft(filledDraft(), now)
    if (!saved.ok) throw new Error(saved.message)
    const invoiceId = saved.data.draft.id
    const later = new Date('2026-10-13T08:00:00.000Z')

    const paid = updateInvoiceStatus(saved.data, invoiceId, 'paid', later)
    expect(paid.invoices[0]?.status).toBe('paid')
    expect(paid.invoices[0]?.updatedAt).toBe(later.toISOString())
    expect(paid.draft.status).toBe('paid')

    const dirtyDraft = { ...paid, dirty: true, draft: { ...paid.draft, status: 'draft' as const } }
    const sent = updateInvoiceStatus(dirtyDraft, invoiceId, 'sent', later)
    expect(sent.invoices[0]?.status).toBe('sent')
    expect(sent.draft.status).toBe('draft')

    expect(updateInvoiceStatus(saved.data, 'missing-id', 'paid', later)).toBe(saved.data)

    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2560)).toBe('2.5 KB')
    expect(formatBytes(1_572_864)).toBe('1.50 MB')
  })
})
