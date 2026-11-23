import { useState } from 'react'
import {
  addProductLine,
  applyCompanyDefaults,
  manualCompanyId,
  suggestInvoiceNumber,
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
type Notice = { text: string; error?: boolean }

export function InvoiceEditor({
  workspace,
  edit,
  view,
  setView,
  onSave,
  onDownload,
  pdfBusy,
  formNotice,
  previewNotice,
  onLoadExample,
  onResetDraft,
  onDuplicate,
  onDelete,
}: {
  workspace: Workspace
  edit: EditInvoice
  view: 'edit' | 'preview'
  setView: (view: 'edit' | 'preview') => void
  onSave: () => void
  onDownload: () => void
  pdfBusy: boolean
  formNotice?: Notice
  previewNotice?: Notice
  onLoadExample?: () => void
  onResetDraft?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}) {
  const draft = workspace.draft
  const [productQuery, setProductQuery] = useState('')
  const [productError, setProductError] = useState('')
  const saved = workspace.invoices.some((invoice) => invoice.id === draft.id)
  const company = workspace.companies.find((entry) => entry.id === draft.companyId)
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
                    ...(!company && draft.companyId !== manualCompanyId
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
                    if (companyId === manualCompanyId) {
                      edit((invoice) => {
                        const manual = { ...invoice, companyId: manualCompanyId }
                        return saved ||
                          (invoice.number &&
                            invoice.number !==
                              suggestInvoiceNumber(invoice, workspace.invoices, company))
                          ? manual
                          : { ...manual, number: suggestInvoiceNumber(manual, workspace.invoices) }
                      })
                    } else {
                      const selected = workspace.companies.find((entry) => entry.id === companyId)
                      if (selected)
                        edit((invoice) =>
                          applyCompanyDefaults(invoice, selected, workspace.invoices, company),
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
                      : 'No products yet. Add one in Catalog.'
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
            <details className="ic-section ic-fold" open>
              <summary>Invoice details</summary>
              <div className="ic-fields">
                <div className="ic-number-field ic-span">
                  <label className="ic-field">
                    Invoice number
                    <input
                      value={draft.number}
                      maxLength={120}
                      onChange={(event) => set('number', event.target.value)}
                    />
                  </label>
                  {!saved && (
                    <button
                      type="button"
                      className="ic-button"
                      onClick={() =>
                        set('number', suggestInvoiceNumber(draft, workspace.invoices, company))
                      }
                    >
                      Generate
                    </button>
                  )}
                </div>
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
                      edit((current) => {
                        const next = { ...current, sender: { ...current.sender, ...patch } }
                        if (
                          saved ||
                          current.companyId !== manualCompanyId ||
                          patch.name === undefined
                        )
                          return next
                        const previous = suggestInvoiceNumber(current, workspace.invoices)
                        return current.number && current.number !== previous
                          ? next
                          : { ...next, number: suggestInvoiceNumber(next, workspace.invoices) }
                      })
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
            </details>
            <details className="ic-section ic-fold" open>
              <summary>Line items</summary>
              <LineItems
                items={draft.items}
                edit={(update) => edit((current) => ({ ...current, items: update(current.items) }))}
                currency={draft.currency}
                caption="Invoice line items"
                empty="Add a line manually or choose a product above."
              />
            </details>
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
            {formNotice && (
              <p
                className={formNotice.error ? 'ic-error' : 'ic-muted'}
                role={formNotice.error ? 'alert' : 'status'}
              >
                {formNotice.text}
              </p>
            )}
            <div className="ic-actions ic-editor-actions">
              <button type="button" className="ic-button ic-primary" onClick={onSave}>
                {saved ? 'Save changes' : 'Create invoice'}
              </button>
              {onResetDraft && (
                <button type="button" className="ic-button" onClick={onResetDraft}>
                  Reset draft
                </button>
              )}
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
          </div>
        </section>
        <InvoicePreview
          invoice={draft}
          onDownload={onDownload}
          pdfBusy={pdfBusy}
          notice={previewNotice}
        />
      </div>
    </>
  )
}
