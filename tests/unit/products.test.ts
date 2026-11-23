import { describe, expect, it } from 'vitest'
import {
  addProductLines,
  applyCompanyDefaults,
  maxItems,
  newCompany,
  newInvoice,
  newItem,
  newProduct,
  newWorkspace,
  saveInvoice,
  saveProduct,
  type Product,
} from '../../src/modules/invoice/domain/invoice'
import { decodeWorkspace } from '../../src/modules/invoice/workspace.browser'

function sampleProduct(patch: Partial<Product> = {}): Product {
  return {
    ...newProduct('USD'),
    name: ' Monthly maintenance ',
    items: [
      { ...newItem('Monitoring'), quantity: '2.5', rate: '100.125' },
      { ...newItem('Priority response'), quantity: '1', rate: '25' },
    ],
    ...patch,
  }
}

describe('product catalog', () => {
  it('preserves v1 history, profiles and theme without restoring the legacy draft', () => {
    const company = newCompany('Studio')
    const draft = newInvoice(company, [])
    const saved = saveInvoice(
      { ...newWorkspace(), companies: [company], theme: 'dark' },
      {
        ...draft,
        client: { ...draft.client, name: 'Example customer' },
        items: [newItem('Existing work')],
      },
    )
    if (!saved.ok) throw new Error(saved.message)
    const legacy = {
      version: 1,
      companies: saved.data.companies,
      invoices: saved.data.invoices,
      draft: { ...draft, shipping: '.' },
      dirty: true,
      theme: 'dark',
    }
    expect(decodeWorkspace(JSON.stringify(legacy))).toEqual(saved.data)
    expect(decodeWorkspace(JSON.stringify({ ...legacy, products: [] }))).toBeNull()
  })

  it('keeps v2 bundles grouped with their identity, currency, and ordered line defaults', () => {
    const { companies, invoices, theme } = newWorkspace()
    const product = sampleProduct()
    const legacy = {
      version: 2,
      companies,
      invoices,
      theme,
      draft: newInvoice(undefined, []),
      dirty: true,
      templates: [product],
    }
    const raw = JSON.stringify(legacy)
    expect(decodeWorkspace(raw)).toEqual({
      version: 4,
      companies,
      invoices,
      theme,
      products: [product],
    })
    expect(decodeWorkspace(JSON.stringify({ ...legacy, templates: [product, product] }))).toBeNull()
    expect(
      decodeWorkspace(JSON.stringify({ ...legacy, templates: [{ ...product, items: [] }] })),
    ).toBeNull()
  })

  it('wraps v3 products as one-item groups without modifying their identity or price', () => {
    const { companies, invoices, theme } = newWorkspace()
    const oldProduct = {
      ...newItem('First item'),
      name: 'One-item product',
      currency: 'JPY',
      quantity: '-2',
      rate: '18.5',
    }
    const legacy = {
      version: 3,
      companies,
      invoices,
      theme,
      draft: newInvoice(undefined, []),
      dirty: false,
      products: [oldProduct],
    }
    const { name, currency, ...item } = oldProduct
    expect(decodeWorkspace(JSON.stringify(legacy))).toEqual({
      version: 4,
      companies,
      invoices,
      theme,
      products: [{ id: item.id, name, currency, items: [item] }],
    })
  })

  it('round-trips products and validates all members at form and backup boundaries', () => {
    const workspace = newWorkspace()
    const input = sampleProduct()
    const saved = saveProduct(workspace, input)
    if (!saved.ok) throw new Error(saved.message)
    expect(saved.data.products).toEqual([{ ...input, name: 'Monthly maintenance' }])
    expect(saved.data.invoices).toBe(workspace.invoices)
    expect(decodeWorkspace(JSON.stringify(saved.data))).toEqual(saved.data)
    const line = newItem('Valid item')
    for (const patch of [
      { name: ' ' },
      { items: [] },
      { items: [line, line] },
      { items: [line, newItem(' ')] },
      { items: [{ ...line, quantity: '1.0001' }] },
      { items: [{ ...line, rate: '-10' }] },
    ]) {
      const invalid = sampleProduct(patch)
      expect(saveProduct(workspace, invalid)).toMatchObject({ ok: false })
      expect(decodeWorkspace(JSON.stringify({ ...workspace, products: [invalid] }))).toBeNull()
    }
    expect(decodeWorkspace(JSON.stringify({ ...saved.data, products: [input, input] }))).toBeNull()
  })

  it('copies the whole group in order, without overwriting invoice lines', () => {
    const draft = newInvoice(undefined, [])
    const product = sampleProduct()
    const first = addProductLines(draft, product)
    if (!first.ok) throw new Error(first.message)
    expect(first.invoice.items).toEqual(
      product.items.map((item) => ({ ...item, id: expect.any(String) })),
    )
    expect(first.invoice.items[0]?.id).not.toBe(product.items[0]?.id)
    const second = addProductLines(first.invoice, product)
    if (!second.ok) throw new Error(second.message)
    expect(second.invoice.items.slice(0, 2)).toEqual(first.invoice.items)
    expect(second.invoice.items.slice(2)).toEqual(
      product.items.map((item) => ({ ...item, id: expect.any(String) })),
    )
    expect(new Set(second.invoice.items.map((item) => item.id)).size).toBe(4)
  })

  it('rejects a whole group when the invoice currency differs or only some lines can fit', () => {
    const draft = newInvoice(undefined, [])
    const product = sampleProduct()
    expect(addProductLines({ ...draft, currency: 'EUR' }, product)).toMatchObject({ ok: false })
    const almostFull = {
      ...draft,
      items: Array.from({ length: maxItems - 1 }, () => newItem('Work')),
    }
    expect(addProductLines(almostFull, product)).toMatchObject({
      ok: false,
      message: expect.stringContaining('only 1'),
    })
    expect(almostFull.items).toHaveLength(maxItems - 1)
  })

  it('keeps new invoices empty and does not reinterpret entered rates when a company is selected', () => {
    const draft = newInvoice(undefined, [])
    const company = {
      ...newCompany('Studio'),
      currency: 'EUR' as const,
      notes: 'Company notes',
      taxRate: '8',
    }
    expect(draft).toMatchObject({
      number: 'INV-0001',
      issueDate: '',
      dueDate: '',
      client: { name: '' },
      sender: { name: '' },
    })
    expect(applyCompanyDefaults(draft, company, [])).toMatchObject({
      companyId: company.id,
      sender: company.sender,
      number: 'INV-0001',
      currency: 'EUR',
      issueDate: '',
      notes: 'Company notes',
      taxRate: '8',
    })
    const priced = { ...draft, items: [{ ...newItem('Work'), rate: '30' }] }
    expect(applyCompanyDefaults(priced, company, [])).toMatchObject({
      currency: 'USD',
      items: priced.items,
    })
    expect(applyCompanyDefaults(priced, company, [priced])).toMatchObject({
      currency: 'USD',
      number: 'INV-0001',
      taxRate: '',
    })
  })

  it('scopes manually entered invoice numbers to their normalized sender name', () => {
    const workspace = newWorkspace()
    const blank = newInvoice(undefined, [])
    const draft = {
      ...blank,
      sender: { ...blank.sender, name: 'Northline Studio' },
      client: { ...blank.client, name: 'Fieldwork Press' },
      number: '2026-01',
      issueDate: '2026-11-23',
      items: [newItem('Illustration')],
    }
    const first = saveInvoice(workspace, draft)
    if (!first.ok) throw new Error(first.message)
    const next = (name: string) =>
      saveInvoice(first.data, {
        ...draft,
        id: crypto.randomUUID(),
        sender: { ...draft.sender, name },
      })
    expect(next(' northline STUDIO ')).toMatchObject({ ok: false })
    expect(next('Maple Studio')).toMatchObject({ ok: true })
  })
})
