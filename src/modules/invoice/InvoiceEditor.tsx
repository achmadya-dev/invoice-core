import { useState } from 'react'
import { ClientField } from './ClientField'
import { invoiceDocument } from './document'
import {
  addProductLines,
  applyCompanyDefaults,
  manualCompanyId,
  matchesProduct,
  suggestInvoiceNumber,
  type Invoice,
  type Sender,
  type Workspace,
} from './domain/invoice'
import { DocumentTotals, InvoicePreview } from './InvoicePreview'
import {
  ContactFields,
  CurrencySelect,
  DecimalField,
  Icon,
  SearchField,
  SelectField,
  SenderFields,
} from './invoice-ui'
import { LineItems } from './LineItems'

type EditInvoice = (edit: (invoice: Invoice) => Invoice) => void
type Notice = { text: string; error?: boolean }

export function InvoiceEditor({
  draft,
  workspace,
  edit,
  view,
  setView,
  onSave,
  onDownload,
  pdfBusy,
  notice,
  onLoadExample,
  onResetDraft,
  onDuplicate,
  onDelete,
}: {
  draft: Invoice
  workspace: Workspace
  edit: EditInvoice
  view: 'edit' | 'preview'
  setView: (view: 'edit' | 'preview') => void
  onSave: () => void
  onDownload: () => void
  pdfBusy: boolean
  notice?: Notice
  onLoadExample?: () => void
  onResetDraft?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}) {
  const [productQuery, setProductQuery] = useState('')
  const [productError, setProductError] = useState('')
  const saved = workspace.invoices.some((invoice) => invoice.id === draft.id)
  const company = workspace.companies.find((entry) => entry.id === draft.companyId)
  const productSearch = productQuery.trim().toLowerCase()
  const products = workspace.products.filter((product) => matchesProduct(product, productSearch))
  const editing = view === 'edit'
  const proof = invoiceDocument(draft)

  function set<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    edit((current) => ({ ...current, [key]: value }))
  }

  function setDate(key: 'issueDate' | 'dueDate', value: string) {
    if (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value)) set(key, value)
  }

  function setSender(patch: Partial<Sender>) {
    edit((current) => {
      const next = { ...current, sender: { ...current.sender, ...patch } }
      if (saved || current.companyId !== manualCompanyId || patch.name === undefined) return next
      const previous = suggestInvoiceNumber(current, workspace.invoices)
      return current.number && current.number !== previous
        ? next
        : { ...next, number: suggestInvoiceNumber(next, workspace.invoices) }
    })
  }

  function selectCompany(companyId: string | null) {
    if (companyId === manualCompanyId) {
      edit((invoice) => {
        const manual = { ...invoice, companyId: manualCompanyId }
        const previous = suggestInvoiceNumber(invoice, workspace.invoices, company)
        return saved || (invoice.number && invoice.number !== previous)
          ? manual
          : { ...manual, number: suggestInvoiceNumber(manual, workspace.invoices) }
      })
    } else {
      const selected = workspace.companies.find((entry) => entry.id === companyId)
      if (selected)
        edit((invoice) => applyCompanyDefaults(invoice, selected, workspace.invoices, company))
    }
    setProductError('')
  }

  function selectProduct(id: string) {
    const product = workspace.products.find((entry) => entry.id === id)
    if (!product) return
    const result = addProductLines(draft, product)
    setProductQuery('')
    if (result.ok) {
      set('items', result.invoice.items)
      setProductError('')
    } else {
      setProductError(result.message)
    }
  }

  return (
    <section className="ic-invoice-stage" aria-labelledby="editor-title">
      <div className="ic-panel-bar">
        <h2 id="editor-title">
          <Icon name={editing ? 'edit' : 'document'} />{' '}
          {editing ? 'Edit invoice' : 'Document preview'}
        </h2>
        <nav className="ic-switcher" aria-label="Invoice view">
          <button
            type="button"
            aria-pressed={editing}
            aria-controls="invoice-editor"
            onClick={() => setView('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            aria-pressed={!editing}
            aria-controls="invoice-preview"
            onClick={() => setView('preview')}
          >
            Preview
          </button>
        </nav>
      </div>
      <div className="ic-proof-stage">
        <article
          id="invoice-editor"
          className="ic-proof"
          aria-label="Editable invoice"
          hidden={!editing}
        >
          <fieldset className="ic-sheet-settings ic-fields">
            <legend className="sr-only">Invoice details</legend>
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
                ...workspace.companies.map((entry) => ({
                  value: entry.id,
                  label: entry.sender.name,
                })),
              ]}
              onChange={selectCompany}
            />
            <CurrencySelect
              value={draft.currency}
              onChange={(value) => {
                set('currency', value)
                setProductError('')
              }}
            />
          </fieldset>
          <header className="ic-doc-heading ic-sheet-columns">
            <div className="ic-party ic-sheet-party">
              {proof.logo && <img className="ic-logo" src={proof.logo} alt="" />}
              <label className="ic-field ic-sheet-name">
                <span className="ic-doc-label">Sender name</span>
                <input
                  maxLength={120}
                  placeholder="Your company or name"
                  value={draft.sender.name}
                  onChange={(event) => setSender({ name: event.target.value })}
                />
              </label>
              <details className="ic-detail">
                <summary>Sender details</summary>
                <div className="ic-fields">
                  <SenderFields
                    sender={draft.sender}
                    theme={workspace.theme}
                    onChange={setSender}
                    showName={false}
                    showPaymentDetails={false}
                  />
                </div>
              </details>
              {proof.senderDetails.length > 0 && (
                <div className="ic-sheet-contact">
                  {proof.senderDetails.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="ic-doc-title">
              <h3>Invoice</h3>
              <div className="ic-number-field">
                <label className="ic-field">
                  <span className="ic-doc-label">Invoice number</span>
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
            </div>
          </header>
          <div className="ic-doc-meta ic-sheet-columns">
            <div className="ic-party ic-sheet-party">
              <span className="ic-doc-label">Bill to</span>
              <ClientField
                client={draft.client}
                invoices={workspace.invoices}
                theme={workspace.theme}
                onChange={(client) => set('client', client)}
              />
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
              {proof.clientDetails.length > 0 && (
                <div className="ic-sheet-contact">
                  {proof.clientDetails.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              )}
            </div>
            <fieldset className="ic-fields ic-sheet-dates">
              <legend className="sr-only">Invoice dates</legend>
              <label className="ic-field">
                <span className="ic-doc-label">Issue date</span>
                <input
                  type="date"
                  value={draft.issueDate}
                  onChange={(event) => setDate('issueDate', event.target.value)}
                />
              </label>
              <label className="ic-field">
                <span className="ic-doc-label">Due date</span>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(event) => setDate('dueDate', event.target.value)}
                />
              </label>
            </fieldset>
          </div>
          <section aria-labelledby="sheet-lines">
            <div className="ic-sheet-line-bar">
              <h4 id="sheet-lines" className="ic-doc-label">
                Line items
              </h4>
              <SearchField
                label="Add product"
                query={productQuery}
                options={products.map((product) => ({
                  value: product.id,
                  label: product.name,
                  detail: `${product.items.length} ${product.items.length === 1 ? 'item' : 'items'} · ${product.currency}`,
                }))}
                placeholder="Search product or item"
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
            <LineItems
              items={draft.items}
              edit={(update) => edit((current) => ({ ...current, items: update(current.items) }))}
              currency={draft.currency}
              caption="Invoice line items"
              empty="No line items. Add a line manually or choose a product above."
              amounts={proof.lines.map((line) => line.amount)}
            />
          </section>
          <div className="ic-sheet-summary">
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
                  onChange={(value) => set('discountKind', value === 'fixed' ? 'fixed' : 'percent')}
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
            <DocumentTotals proof={proof} currency={draft.currency} />
          </div>
          <div className="ic-doc-extras ic-sheet-extras">
            {(
              [
                { key: 'notes', label: 'Notes', placeholder: 'Notes to the client (optional)' },
                { key: 'terms', label: 'Terms', placeholder: 'Payment terms (optional)' },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <label className="ic-field" key={key}>
                <span className="ic-doc-label">{label}</span>
                <textarea
                  maxLength={1500}
                  rows={2}
                  placeholder={placeholder}
                  value={draft[key]}
                  onChange={(event) => set(key, event.target.value)}
                />
              </label>
            ))}
            <label className="ic-field ic-span">
              <span className="ic-doc-label">Payment details</span>
              <textarea
                maxLength={1500}
                rows={2}
                placeholder="Bank, account, or payment instructions (optional)"
                value={draft.sender.paymentDetails}
                onChange={(event) => setSender({ paymentDetails: event.target.value })}
              />
            </label>
          </div>
          <footer className="ic-doc-footer">
            <span>{proof.number}</span>
            <span>{draft.currency}</span>
          </footer>
        </article>
        <InvoicePreview proof={proof} currency={draft.currency} hidden={editing} />
      </div>
      <div className="ic-sheet-actions">
        {notice && (
          <p
            className={notice.error ? 'ic-error' : 'ic-muted'}
            role={notice.error ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}
        <div className="ic-actions">
          {editing && (
            <>
              <button type="button" className="ic-button ic-primary" onClick={onSave}>
                {saved ? 'Save changes' : 'Create invoice'}
              </button>
              {onLoadExample && (
                <button type="button" className="ic-button" onClick={onLoadExample}>
                  Load example
                </button>
              )}
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
            </>
          )}
          <button
            type="button"
            className="ic-button ic-sheet-download"
            disabled={pdfBusy}
            onClick={onDownload}
          >
            <Icon name="download" /> {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </section>
  )
}
