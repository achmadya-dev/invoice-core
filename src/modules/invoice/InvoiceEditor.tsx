import { useState } from 'react'
import { lineTemplates } from './domain/catalog'
import {
  applyLineItemTemplate,
  decimalValid,
  invoiceStatuses,
  newInvoice,
  newItem,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import {
  ContactFields,
  CurrencySelect,
  Icon,
  SelectField,
  SenderFields,
  type ConfirmState,
} from './invoice-ui'
import { InvoicePreview } from './InvoicePreview'
import { LineItems } from './LineItems'

type EditInvoice = (edit: (invoice: Invoice) => Invoice) => void

export function InvoiceEditor({
  workspace,
  edit,
  view,
  setView,
  onLoadExample,
  onResetDraft,
  onDuplicate,
  onDelete,
  onManageTemplates,
  requestConfirm,
}: {
  workspace: Workspace
  edit: EditInvoice
  view: 'edit' | 'preview'
  setView: (view: 'edit' | 'preview') => void
  onLoadExample?: () => void
  onResetDraft?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onManageTemplates: () => void
  requestConfirm: (confirm: ConfirmState) => void
}) {
  const draft = workspace.draft
  const [template, setTemplate] = useState('')
  const [templateError, setTemplateError] = useState('')
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
  function applyTemplate() {
    const custom = workspace.templates.find((entry) => entry.id === template)
    const starter = lineTemplates.find((entry) => entry.name === template)
    const chosen = custom ?? starter
    if (!chosen) return

    let items: Invoice['items']
    if (custom) {
      const result = applyLineItemTemplate(draft, custom)
      if (!result.ok) {
        setTemplateError(result.message)
        return
      }
      items = result.invoice.items
    } else if (starter) {
      items = starter.lines.map(newItem)
    } else {
      return
    }
    const apply = () => {
      set('items', items)
      setTemplate('')
      setTemplateError('')
    }
    const filled = draft.items.some(
      (item) => item.description || item.rate || !['', '1'].includes(item.quantity),
    )
    if (!filled) {
      apply()
      return
    }
    requestConfirm({
      title: 'Replace current line items?',
      description: `Replace the existing line items on this draft with the ${chosen.name} template?`,
      confirmLabel: 'Replace line items',
      danger: true,
      onConfirm: apply,
    })
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
          <Icon name="edit" /> Edit
        </button>
        <button
          type="button"
          aria-pressed={view === 'preview'}
          aria-controls="invoice-preview"
          onClick={() => setView('preview')}
        >
          <Icon name="document" /> Preview
        </button>
      </nav>
      <div className="ic-layout" data-view={view}>
        <section className="ic-editor" id="invoice-editor" aria-labelledby="editor-title">
          <div className="ic-panel-bar">
            <h2 id="editor-title">
              <Icon name="edit" /> Edit invoice
            </h2>
            <div className="ic-panel-actions">
              {onLoadExample && (
                <button type="button" className="ic-panel-button" onClick={onLoadExample}>
                  Load example
                </button>
              )}
              {onResetDraft && (
                <button
                  type="button"
                  className="ic-panel-button ic-panel-button-danger"
                  onClick={onResetDraft}
                >
                  Reset draft
                </button>
              )}
              <span className={`ic-tag ic-${draft.status}`}>{draft.status}</span>
            </div>
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
                  onChange={(value) => {
                    set('currency', value)
                    setTemplateError('')
                  }}
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
              <div className="ic-actions ic-line-heading">
                <h3 id="lines-title">Line items</h3>
                <button type="button" className="ic-text-button" onClick={onManageTemplates}>
                  Manage templates
                </button>
              </div>
              <LineItems
                items={draft.items}
                edit={(update) => edit((current) => ({ ...current, items: update(current.items) }))}
                currency={draft.currency}
                caption="Invoice line items"
                empty="Add a line item or apply a template."
              >
                <SelectField
                  label="Line item template"
                  value={template}
                  placeholder="Choose a template"
                  compact
                  popupClassName="ic-template-popup"
                  options={[
                    ...workspace.templates.map((entry) => ({
                      value: entry.id,
                      label: `${entry.name} (${entry.currency})`,
                      group: 'My templates',
                    })),
                    ...lineTemplates.map((entry) => ({
                      value: entry.name,
                      label: entry.name,
                      group: entry.group,
                    })),
                  ]}
                  onChange={(value) => {
                    setTemplate(value)
                    setTemplateError('')
                  }}
                />
                <button
                  className="ic-button"
                  type="button"
                  disabled={!template}
                  onClick={applyTemplate}
                >
                  Apply
                </button>
              </LineItems>
              {templateError && (
                <p className="ic-error ic-note" role="alert">
                  {templateError}
                </p>
              )}
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
            {saved && (onDuplicate || onDelete) ? (
              <>
                <span>Saved in local history</span>
                <div className="ic-actions">
                  {onDuplicate && (
                    <button type="button" className="ic-panel-button" onClick={onDuplicate}>
                      Duplicate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="ic-panel-button ic-panel-button-danger"
                      onClick={onDelete}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <span>Preview updates as you type</span>
                <span>Stored on this device</span>
              </>
            )}
          </div>
        </section>
        <InvoicePreview
          invoice={draft}
          focused={view === 'preview'}
          onToggleFocus={() => setView(view === 'edit' ? 'preview' : 'edit')}
        />
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
