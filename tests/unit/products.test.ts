import { describe, expect, it } from 'vitest'
import {
  addProductLine,
  applyCompanyDefaults,
  maxItems,
  newCompany,
  newInvoice,
  newItem,
  newProduct,
  newWorkspace,
  saveDraft,
  saveProduct,
  type Product,
} from '../../src/modules/invoice/domain/invoice'
import { decodeWorkspace } from '../../src/modules/invoice/workspace.browser'

function sampleProduct(patch: Partial<Product> = {}): Product {
  return {
    ...newProduct('USD'),
    name: ' Monthly maintenance ',
    description: 'Monitoring',
    quantity: '2.5',
    rate: '100.125',
    ...patch,
  }
}

describe('product catalog', () => {
  it('preserves v1 history, profiles and incomplete drafts while opening an empty catalog', () => {
    const workspace = newWorkspace()
    const company = newCompany('Studio')
    const draft = newInvoice(company, [])
    const saved = saveDraft({
      ...workspace,
      companies: [company],
      draft: {
        ...draft,
        client: { ...draft.client, name: 'Example customer' },
        items: [newItem('Existing work')],
      },
    })
    if (!saved.ok) throw new Error(saved.message)
    const legacy = {
      version: 1,
      companies: saved.data.companies,
      invoices: saved.data.invoices,
      draft: { ...saved.data.draft, shipping: '.' },
      dirty: true,
      theme: 'system',
    }
    expect(decodeWorkspace(JSON.stringify(legacy))).toEqual({ ...legacy, version: 3, products: [] })
    expect(decodeWorkspace(JSON.stringify({ ...legacy, products: [] }))).toBeNull()
  })

  it('migrates v2 bundle lines into separate products with reproducible identities', () => {
    const workspace = newWorkspace()
    const item = { ...newItem('Monitoring'), rate: '90' }
    const credit = { ...newItem('Credit'), quantity: '-1', rate: '25' }
    const legacy = {
      version: 2,
      companies: workspace.companies,
      invoices: workspace.invoices,
      draft: workspace.draft,
      theme: workspace.theme,
      dirty: workspace.dirty,
      templates: [
        {
          id: crypto.randomUUID(),
          name: 'Monthly services',
          currency: 'USD',
          items: [item, credit],
        },
        { id: crypto.randomUUID(), name: 'Monitoring prepaid', currency: 'EUR', items: [item] },
      ],
    }
    const raw = JSON.stringify(legacy)
    const migrated = decodeWorkspace(raw)
    expect(migrated?.draft).toEqual(workspace.draft)
    expect(migrated?.products).toEqual([
      { ...item, id: expect.any(String), name: 'Monitoring', currency: 'USD' },
      { ...credit, id: expect.any(String), name: 'Credit', currency: 'USD' },
      { ...item, id: expect.any(String), name: 'Monitoring prepaid', currency: 'EUR' },
    ])
    expect(new Set(migrated?.products.map(({ id }) => id)).size).toBe(3)
    expect(decodeWorkspace(raw)).toEqual(migrated)
    expect(
      decodeWorkspace(
        JSON.stringify({ ...legacy, templates: [legacy.templates[0], legacy.templates[0]] }),
      ),
    ).toBeNull()
  })

  it('round-trips products and validates both the form domain and backup boundary', () => {
    const workspace = newWorkspace()
    const input = sampleProduct()
    const saved = saveProduct(workspace, input)
    if (!saved.ok) throw new Error(saved.message)
    expect(saved.data.products).toEqual([{ ...input, name: 'Monthly maintenance' }])
    expect(saved.data.draft).toBe(workspace.draft)
    expect(decodeWorkspace(JSON.stringify(saved.data))).toEqual(saved.data)
    for (const patch of [
      { name: ' ' },
      { description: ' ' },
      { quantity: '1.0001' },
      { rate: '-10' },
    ]) {
      const invalid = sampleProduct(patch)
      expect(saveProduct(workspace, invalid)).toMatchObject({ ok: false })
      expect(decodeWorkspace(JSON.stringify({ ...workspace, products: [invalid] }))).toBeNull()
    }
    expect(decodeWorkspace(JSON.stringify({ ...saved.data, products: [input, input] }))).toBeNull()
  })

  it('adds one independent line without changing existing lines or currency', () => {
    const { draft } = newWorkspace()
    const product = sampleProduct()
    expect(addProductLine({ ...draft, currency: 'EUR' }, product)).toMatchObject({ ok: false })
    const full = { ...draft, items: Array.from({ length: maxItems }, () => newItem('Work')) }
    expect(addProductLine(full, product)).toMatchObject({ ok: false })
    const first = addProductLine(draft, product)
    if (!first.ok) throw new Error(first.message)
    const second = addProductLine(first.invoice, product)
    if (!second.ok) throw new Error(second.message)
    expect(first.invoice.items).toEqual([
      { id: expect.any(String), description: 'Monitoring', quantity: '2.5', rate: '100.125' },
    ])
    expect(second.invoice.items[0]).toBe(first.invoice.items[0])
    expect(second.invoice.items[1]?.id).not.toBe(first.invoice.items[0]?.id)
    expect(second.invoice.items[1]?.id).not.toBe(product.id)
  })

  it('keeps manual invoices blank and does not silently reinterpret entered rates when a company is selected', () => {
    const { draft } = newWorkspace()
    const company = {
      ...newCompany('Studio'),
      currency: 'EUR' as const,
      notes: 'Company notes',
      taxRate: '8',
    }
    expect(draft).toMatchObject({
      number: '',
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
      number: '',
      taxRate: '',
    })
  })

  it('scopes manually entered invoice numbers to their normalized sender name', () => {
    const workspace = newWorkspace()
    const draft = {
      ...workspace.draft,
      sender: { ...workspace.draft.sender, name: 'Northline Studio' },
      client: { ...workspace.draft.client, name: 'Fieldwork Press' },
      number: '2026-01',
      issueDate: '2026-11-23',
      items: [newItem('Illustration')],
    }
    const first = saveDraft({ ...workspace, draft })
    if (!first.ok) throw new Error(first.message)
    const next = (name: string) =>
      saveDraft({
        ...first.data,
        draft: { ...draft, id: crypto.randomUUID(), sender: { ...draft.sender, name } },
      })
    expect(next(' northline STUDIO ')).toMatchObject({ ok: false })
    expect(next('Maple Studio')).toMatchObject({ ok: true })
  })
})
