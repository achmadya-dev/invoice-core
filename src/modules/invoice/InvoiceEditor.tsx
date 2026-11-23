import { useState } from 'react'
import { lineTemplates } from './domain/catalog'
import {
  decimalValid,
  invoiceStatuses,
  maxItems,
  newInvoice,
  newItem,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import { ContactFields, CurrencySelect, Icon, SelectField, SenderFields } from './invoice-ui'
import { InvoicePreview } from './InvoicePreview'

type EditInvoice = (edit: (invoice: Invoice) => Invoice) => void

export function InvoiceEditor({
  workspace,
  edit,
  view,
  setView,
}: {
  workspace: Workspace
  edit: EditInvoice
  view: 'edit' | 'preview'
  setView: (view: 'edit' | 'preview') => void
}) {
  const draft = workspace.draft
  const [template, setTemplate] = useState('')
  const saved = workspace.invoices.some((invoice) => invoice.id === draft.id)
  const companyExists = workspace.companies.some((company) => company.id === draft.companyId)
  const previousClients = new Map<string, Invoice['client']>()
  for (const invoice of workspace.invoices) {
    const key = invoice.client.name.trim().toLowerCase()
    if (key && !previousClients.has(key)) previousClients.set(key, invoice.client)
  }
  function set<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    edit((current) => ({ ...current, [key]: value }))
  }
  function setDate(key: 'issueDate' | 'dueDate', value: string) {
    if (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value)) set(key, value)
  }
  function addLine() {
    const item = newItem()
    edit((current) => ({ ...current, items: [...current.items, item] }))
    requestAnimationFrame(() => document.getElementById(`description-${item.id}`)?.focus())
  }

  return (
    <>
      <nav className="ic-switcher" aria-label="Invoice view">
        <button
          type="button"
          aria-pressed={view === 'edit'}
          aria-controls="invoice-editor"
          onClick={() => setView('edit')}
        >
          Edit
        </button>
        <button
          type="button"
          aria-pressed={view === 'preview'}
          aria-controls="invoice-preview"
          onClick={() => setView('preview')}
        >
          Preview
        </button>
      </nav>
      <div className="ic-layout" data-view={view}>
        <section className="ic-editor" id="invoice-editor" aria-labelledby="editor-title">
          <div className="ic-panel-bar">
            <h2 id="editor-title">
              <Icon name="edit" /> Edit invoice
            </h2>
            <span className={`ic-tag ic-${draft.status}`}>{draft.status}</span>
          </div>
          <div className="ic-editor-body">
            <section className="ic-section" aria-labelledby="details-title">
              <h3 id="details-title">Invoice details</h3>
              <div className="ic-fields">
                <label className="ic-field">
                  Invoice number
                  <input
                    value={draft.number}
                    maxLength={120}
                    onChange={(event) => set('number', event.target.value)}
                  />
                </label>
                <SelectField
                  label="Sender profile"
                  value={draft.companyId}
                  options={[
                    ...(!companyExists
                      ? [
                          {
                            value: draft.companyId,
                            label: `${draft.sender.name || 'Previous sender'} (saved details)`,
                          },
                        ]
                      : []),
                    ...workspace.companies.map((company) => ({
                      value: company.id,
                      label: company.sender.name,
                    })),
                  ]}
                  onChange={(companyId) => {
                    const company = workspace.companies.find((entry) => entry.id === companyId)
                    if (!company) return
                    edit((current) => {
                      const defaults = newInvoice(company, workspace.invoices)
                      return {
                        ...current,
                        companyId: company.id,
                        sender: company.sender,
                        ...(saved
                          ? {}
                          : {
                              number: defaults.number,
                              currency: defaults.currency,
                              taxRate: defaults.taxRate,
                              taxLabel: defaults.taxLabel,
                              notes: current.notes || defaults.notes,
                              terms: current.terms || defaults.terms,
                            }),
                      }
                    })
                  }}
                />
                <label className="ic-field">
                  Issue date
                  <input
                    type="date"
                    value={draft.issueDate}
                    onChange={(event) => setDate('issueDate', event.target.value)}
                  />
                </label>
                <label className="ic-field">
                  Due date
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) => setDate('dueDate', event.target.value)}
                  />
                </label>
                <CurrencySelect
                  value={draft.currency}
                  onChange={(value) => set('currency', value)}
                />
                <SelectField
                  label="Status"
                  value={draft.status}
                  options={invoiceStatuses.map((status) => ({
                    value: status,
                    label: `${status[0]?.toUpperCase()}${status.slice(1)}`,
                  }))}
                  onChange={(status) => {
                    const match = invoiceStatuses.find((value) => value === status)
                    if (match) set('status', match)
                  }}
                />
                <label className="ic-field ic-span">
                  Client name
                  <input
                    value={draft.client.name}
                    maxLength={120}
                    placeholder="Client or business name"
                    onChange={(event) => {
                      const name = event.target.value
                      edit((current) => ({ ...current, client: { ...current.client, name } }))
                    }}
                  />
                </label>
              </div>
              <details className="ic-detail">
                <summary>Sender details</summary>
                <div className="ic-fields">
                  <SenderFields
                    sender={draft.sender}
                    theme={workspace.theme}
                    onChange={(patch) =>
                      edit((current) => ({
                        ...current,
                        sender: { ...current.sender, ...patch },
                      }))
                    }
                  />
                </div>
                <p className="ic-muted ic-note">Changes here apply to this invoice only.</p>
              </details>
              <details className="ic-detail">
                <summary>Billing details</summary>
                <div className="ic-fields">
                  {previousClients.size > 0 && (
                    <SelectField
                      label="Reuse a previous client"
                      value=""
                      placeholder="Select a client"
                      span
                      options={Array.from(previousClients.entries(), ([key, contact]) => ({
                        value: key,
                        label: contact.name,
                      }))}
                      onChange={(key) => {
                        const contact = previousClients.get(key)
                        if (contact) set('client', contact)
                      }}
                    />
                  )}
                  <ContactFields
                    label="Billing contact"
                    contact={draft.client}
                    theme={workspace.theme}
                    onChange={(patch) =>
                      edit((current) => ({ ...current, client: { ...current.client, ...patch } }))
                    }
                  />
                </div>
              </details>
            </section>
            <section className="ic-section" aria-labelledby="lines-title">
              <h3 id="lines-title">Line items</h3>
              <div className="ic-items">
                {draft.items.length === 0 && (
                  <p className="ic-muted">Add a line item or apply a template.</p>
                )}
                {draft.items.length > 0 && (
                  <table className="ic-item-table">
                    <caption className="sr-only">Invoice line items</caption>
                    <thead>
                      <tr>
                        <th scope="col">Description</th>
                        <th scope="col">Qty</th>
                        <th scope="col">Rate</th>
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.items.map((item, index) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              id={`description-${item.id}`}
                              aria-label={`Description, item ${index + 1}`}
                              maxLength={240}
                              placeholder="Service or product"
                              value={item.description}
                              onChange={(event) => {
                                const description = event.target.value
                                edit((current) => ({
                                  ...current,
                                  items: current.items.map((line) =>
                                    line.id === item.id ? { ...line, description } : line,
                                  ),
                                }))
                              }}
                            />
                          </td>
                          {(['quantity', 'rate'] as const).map((key) => (
                            <td key={key}>
                              <input
                                aria-label={`${key === 'quantity' ? 'Quantity' : 'Rate'}, item ${index + 1}`}
                                aria-invalid={
                                  !decimalValid(
                                    item[key],
                                    key === 'quantity' ? 'quantity' : 'amount',
                                  )
                                }
                                aria-describedby="amount-help"
                                inputMode="decimal"
                                maxLength={16}
                                placeholder="0"
                                value={item[key]}
                                onChange={(event) => {
                                  const value = event.target.value
                                  edit((current) => ({
                                    ...current,
                                    items: current.items.map((line) =>
                                      line.id === item.id ? { ...line, [key]: value } : line,
                                    ),
                                  }))
                                }}
                              />
                            </td>
                          ))}
                          <td>
                            <button
                              className="ic-icon-button"
                              type="button"
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() => {
                                edit((current) => ({
                                  ...current,
                                  items: current.items.filter((line) => line.id !== item.id),
                                }))
                                const next = draft.items[index + 1] ?? draft.items[index - 1]
                                requestAnimationFrame(() =>
                                  document
                                    .getElementById(
                                      next ? `description-${next.id}` : 'add-invoice-line',
                                    )
                                    ?.focus(),
                                )
                              }}
                            >
                              <Icon name="close" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="ic-actions ic-line-controls">
                <button
                  id="add-invoice-line"
                  className="ic-button"
                  type="button"
                  disabled={draft.items.length >= maxItems}
                  onClick={addLine}
                >
                  <Icon name="plus" /> Add line item
                </button>
                <SelectField
                  label="Line item template"
                  value={template}
                  placeholder="Choose a template"
                  compact
                  options={lineTemplates.map((entry) => ({
                    value: entry.name,
                    label: entry.name,
                  }))}
                  onChange={setTemplate}
                />
                <button
                  className="ic-button"
                  type="button"
                  disabled={!template}
                  onClick={() => {
                    const chosen = lineTemplates.find((entry) => entry.name === template)
                    if (!chosen) return
                    const filled = draft.items.some(
                      (item) => item.description || item.rate || !['', '1'].includes(item.quantity),
                    )
                    if (
                      filled &&
                      !window.confirm('Replace the current line items with this template?')
                    )
                      return
                    set('items', chosen.lines.map(newItem))
                    setTemplate('')
                  }}
                >
                  Apply
                </button>
              </div>
              <p id="amount-help" className="ic-muted ic-note">
                Use up to three decimal places. Rates use {draft.currency}.
              </p>
            </section>
            <section className="ic-section" aria-label="Adjustments and notes">
              <details className="ic-detail">
                <summary>Discount, tax, and shipping</summary>
                <div className="ic-fields">
                  <SelectField
                    label="Discount type"
                    value={draft.discountKind}
                    options={[
                      { value: 'percent', label: 'Percentage' },
                      { value: 'fixed', label: 'Fixed amount' },
                    ]}
                    onChange={(value) =>
                      set('discountKind', value === 'fixed' ? 'fixed' : 'percent')
                    }
                  />
                  <DecimalField
                    label={draft.discountKind === 'percent' ? 'Discount (%)' : 'Discount amount'}
                    value={draft.discount}
                    kind={draft.discountKind === 'percent' ? 'percent' : 'amount'}
                    onChange={(value) => set('discount', value)}
                  />
                  <label className="ic-field">
                    Tax label
                    <input
                      maxLength={120}
                      value={draft.taxLabel}
                      onChange={(event) => set('taxLabel', event.target.value)}
                    />
                  </label>
                  <DecimalField
                    label="Tax rate (%)"
                    value={draft.taxRate}
                    kind="percent"
                    onChange={(value) => set('taxRate', value)}
                  />
                  <DecimalField
                    label="Shipping"
                    value={draft.shipping}
                    kind="amount"
                    onChange={(value) => set('shipping', value)}
                  />
                </div>
              </details>
              <details className="ic-detail">
                <summary>Notes and terms</summary>
                <div className="ic-fields">
                  {(['notes', 'terms'] as const).map((key) => (
                    <label className="ic-field ic-span" key={key}>
                      {key === 'notes' ? 'Notes' : 'Terms'}
                      <textarea
                        maxLength={1500}
                        rows={3}
                        value={draft[key]}
                        onChange={(event) => set(key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </details>
            </section>
          </div>
          <div className="ic-editor-foot">
            <span>Preview updates as you type</span>
            <span>Stored on this device</span>
          </div>
        </section>
        <InvoicePreview invoice={draft} />
      </div>
    </>
  )
}

export function DecimalField({
  label,
  value,
  kind,
  onChange,
}: {
  label: string
  value: string
  kind: 'amount' | 'percent'
  onChange: (value: string) => void
}) {
  return (
    <label className="ic-field">
      {label}
      <input
        inputMode="decimal"
        maxLength={16}
        aria-invalid={!decimalValid(value, kind)}
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
