import { useState } from 'react'
import {
  addProductLine,
  applyCompanyDefaults,
  invoiceStatuses,
  manualCompanyId,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import {
  ContactFields,
  CurrencySelect,
  DecimalField,
  Icon,
  SearchField,
  SelectField,
  SenderFields,
} from './invoice-ui'
import { ClientField } from './ClientField'
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
}: {
  workspace: Workspace
  edit: EditInvoice
  view: 'edit' | 'preview'
  setView: (view: 'edit' | 'preview') => void
  onLoadExample?: () => void
  onResetDraft?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}) {
  const draft = workspace.draft
  const [productQuery, setProductQuery] = useState('')
  const [productError, setProductError] = useState('')
  const saved = workspace.invoices.some((invoice) => invoice.id === draft.id)
  const companyExists = workspace.companies.some((company) => company.id === draft.companyId)
  const productSearch = productQuery.trim().toLowerCase()
  const products = workspace.products.filter((product) =>
    [product.name, product.description, product.currency].some((value) =>
      value.toLowerCase().includes(productSearch),
    ),
  )
  function set<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    edit((current) => ({ ...current, [key]: value }))
  }
  function setDate(key: 'issueDate' | 'dueDate', value: string) {
    if (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value)) set(key, value)
  }
  function selectProduct(id: string) {
    const product = workspace.products.find((entry) => entry.id === id)
    if (!product) return
    const result = addProductLine(draft, product)
    setProductQuery('')
    if (result.ok) {
      set('items', result.invoice.items)
      setProductError('')
    } else {
      setProductError(result.message)
    }
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
            <section className="ic-section" aria-labelledby="defaults-title">
              <h3 id="defaults-title">Company and products</h3>
              <div className="ic-fields">
                <SelectField
                  label="Company"
                  value={draft.companyId}
                  options={[
                    { value: manualCompanyId, label: 'Enter sender manually' },
                    ...(!companyExists && draft.companyId !== manualCompanyId
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
                    if (companyId === manualCompanyId) set('companyId', manualCompanyId)
                    else {
                      const company = workspace.companies.find((entry) => entry.id === companyId)
                      if (company)
                        edit((invoice) =>
                          applyCompanyDefaults(invoice, company, workspace.invoices),
                        )
                    }
                    setProductError('')
                  }}
                />
                <SearchField
                  label="Add product"
                  query={productQuery}
                  options={products.map((product) => ({
                    value: product.id,
                    label: product.name,
                    detail: `${product.currency}${product.description !== product.name ? ` · ${product.description}` : ''}`,
                  }))}
                  placeholder="Search products"
                  empty={
                    workspace.products.length
                      ? 'No matching products.'
                      : 'No products yet. Add one from the Products tab.'
                  }
                  theme={workspace.theme}
                  onQuery={(query) => {
                    setProductQuery(query)
                    setProductError('')
                  }}
                  onSelect={selectProduct}
                  onDismiss={() => setProductQuery('')}
                />
              </div>
              {productError && (
                <p className="ic-error ic-note" role="alert">
                  {productError}
                </p>
              )}
              <p className="ic-muted ic-note">
                Optional. Enter sender details and line items manually if you prefer.
              </p>
            </section>
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
                    setProductError('')
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
                <div className="ic-span">
                  <ClientField
                    client={draft.client}
                    invoices={workspace.invoices}
                    theme={workspace.theme}
                    onChange={(client) => set('client', client)}
                  />
                </div>
              </div>
              <details
                className="ic-detail"
                open={draft.companyId === manualCompanyId || undefined}
              >
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
                    showName={false}
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
              <LineItems
                items={draft.items}
                edit={(update) => edit((current) => ({ ...current, items: update(current.items) }))}
                currency={draft.currency}
                caption="Invoice line items"
                empty="Add a line manually or choose a product above."
              />
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
