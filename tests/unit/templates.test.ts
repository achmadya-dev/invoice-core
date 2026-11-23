import { describe, expect, it } from 'vitest'
import {
  applyLineItemTemplate,
  maxItems,
  maxTemplates,
  newItem,
  newLineItemTemplate,
  newWorkspace,
  saveDraft,
  saveLineItemTemplate,
  type LineItemTemplate,
} from '../../src/modules/invoice/domain/invoice'
import { decodeWorkspace } from '../../src/modules/invoice/workspace.browser'

function sampleTemplate(patch: Partial<LineItemTemplate> = {}): LineItemTemplate {
  return {
    ...newLineItemTemplate('USD'),
    name: ' Monthly maintenance ',
    items: [
      { ...newItem('Monitoring'), quantity: '2.5', rate: '100.125' },
      { ...newItem('Service credit'), quantity: '-1', rate: '25' },
    ],
    ...patch,
  }
}

describe('custom line item templates', () => {
  it('loads a v1 backup without changing histories, sender defaults, or incomplete drafts', () => {
    const empty = newWorkspace()
    const saved = saveDraft({
      ...empty,
      draft: {
        ...empty.draft,
        client: { ...empty.draft.client, name: 'Example customer' },
        items: [newItem('Existing work')],
      },
    })
    if (!saved.ok) throw new Error(saved.message)
    const { draft, companies, theme, invoices } = saved.data
    const legacy = {
      version: 1,
      companies,
      invoices,
      draft: { ...draft, shipping: '.' },
      dirty: true,
      theme,
    }
    expect(decodeWorkspace(JSON.stringify(legacy))).toEqual({
      ...legacy,
      version: 2,
      templates: [],
    })
    expect(decodeWorkspace(JSON.stringify({ ...legacy, templates: [] }))).toBeNull()
  })

  it('round-trips saved templates without changing the active invoice', () => {
    const workspace = newWorkspace()
    const template = sampleTemplate()
    const saved = saveLineItemTemplate(workspace, template)
    if (!saved.ok) throw new Error(saved.message)
    const updated = saveLineItemTemplate(saved.data, { ...template, name: 'Support plan' })
    if (!updated.ok) throw new Error(updated.message)

    expect(saved.data.templates).toEqual([{ ...template, name: 'Monthly maintenance' }])
    expect(updated.data.templates).toEqual([{ ...template, name: 'Support plan' }])
    expect(updated.data.draft).toBe(workspace.draft)
    expect(decodeWorkspace(JSON.stringify(updated.data))).toEqual(updated.data)
  })

  it('rejects malformed lines, duplicates, and over-limit templates at save and restore', () => {
    const workspace = newWorkspace()
    const template = sampleTemplate()
    const invalid = [
      { ...template, name: ' ' },
      { ...template, items: [] },
      { ...template, items: [newItem()] },
      { ...template, items: [{ ...newItem('Work'), rate: '-10' }] },
      { ...template, items: [{ ...newItem('Work'), quantity: '1.0001' }] },
      { ...template, items: [...template.items, ...template.items] },
      {
        ...template,
        items: Array.from({ length: maxItems + 1 }, () => newItem('Recurring work')),
      },
    ]
    for (const entry of invalid) {
      expect(saveLineItemTemplate(workspace, entry)).toMatchObject({ ok: false })
      expect(decodeWorkspace(JSON.stringify({ ...workspace, templates: [entry] }))).toBeNull()
    }

    const populated = { ...workspace, templates: [template] }
    const duplicate = sampleTemplate({ name: 'monthly MAINTENANCE' })
    expect(saveLineItemTemplate(populated, duplicate)).toMatchObject({ ok: false })
    expect(
      decodeWorkspace(JSON.stringify({ ...workspace, templates: [template, duplicate] })),
    ).toBeNull()
    expect(saveLineItemTemplate(populated, { ...duplicate, currency: 'JPY' }).ok).toBe(true)

    const full = {
      ...workspace,
      templates: Array.from({ length: maxTemplates }, (_, index) =>
        sampleTemplate({ name: `Template ${index}` }),
      ),
    }
    expect(saveLineItemTemplate(full, template)).toMatchObject({ ok: false })
    expect(
      decodeWorkspace(JSON.stringify({ ...full, templates: [...full.templates, template] })),
    ).toBeNull()
  })

  it('rejects a different currency and copies items with new IDs without changing other fields', () => {
    const { draft } = newWorkspace()
    const template = sampleTemplate()
    expect(applyLineItemTemplate({ ...draft, currency: 'EUR' }, template)).toMatchObject({
      ok: false,
      message: expect.stringContaining('This template uses USD'),
    })
    const result = applyLineItemTemplate(draft, template)
    if (!result.ok) throw new Error(result.message)
    expect(result.invoice).toEqual({
      ...draft,
      items: template.items.map((item) => ({ ...item, id: expect.any(String) })),
    })
    for (const [index, item] of result.invoice.items.entries()) {
      expect(item.id).not.toBe(template.items[index]?.id)
    }
  })
})
