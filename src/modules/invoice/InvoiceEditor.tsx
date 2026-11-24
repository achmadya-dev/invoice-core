import { useState } from 'react'
import { ClientPicker } from './ClientPicker'
import { invoiceDocument } from './document'
import { countryName } from './domain/catalog'
import {
  addProductLines,
  applyCompanyDefaults,
  decimalValid,
  deriveInvoicePalette,
  formatMoney,
  invoiceTotals,
  manualCompanyId,
  matchesProduct,
  resolveAccentColor,
  resolveInvoiceLayout,
  suggestInvoiceNumber,
  type Invoice,
  type Sender,
  type Workspace,
} from './domain/invoice'
import { InvoicePreview, invoicePaletteVars } from './InvoicePreview'
import {
  ContactFields,
  CountrySelect,
  CurrencySelect,
  Icon,
  LogoField,
  SearchField,
  SelectField,
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
  showErrors = false,
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
  showErrors?: boolean
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
  const totals = invoiceTotals(draft)
  const accentColor = resolveAccentColor(draft)
  const invoiceLayout = resolveInvoiceLayout(draft)
  const palette = deriveInvoicePalette(accentColor)

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
      <div className="ic-sheet-tools" hidden={!editing} role="region" aria-label="Invoice options">
        <div className="ic-sheet-pickers">
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
          <ClientPicker
            invoices={workspace.invoices}
            theme={workspace.theme}
            onChange={(client) => set('client', client)}
          />
          <SearchField
            label="Add product"
            query={productQuery}
            options={products.map((product) => ({
              value: product.id,
              label: product.name,
              detail: `${product.items.length} ${product.items.length === 1 ? 'item' : 'items'} · ${product.currency}`,
            }))}
            placeholder="Product or item"
            empty={
              workspace.products.length
                ? 'No matching products.'
                : 'No products yet. Add one in Products.'
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
        <details className="ic-detail">
          <summary>More options</summary>
          <div className="ic-fields">
            <CountrySelect
              label="Sender country"
              value={draft.sender.country}
              theme={workspace.theme}
              onChange={(country) => setSender({ country })}
            />
            <CountrySelect
              label="Billing contact country"
              value={draft.client.country}
              theme={workspace.theme}
              onChange={(country) =>
                edit((current) => ({ ...current, client: { ...current.client, country } }))
              }
            />
            <SelectField
              label="Discount type"
              value={draft.discountKind}
              options={[
                { value: 'percent', label: 'Percentage' },
                { value: 'fixed', label: 'Fixed amount' },
              ]}
              onChange={(value) => set('discountKind', value === 'fixed' ? 'fixed' : 'percent')}
            />
          </div>
        </details>
      </div>
      <div className="ic-proof-stage">
        <article
          id="invoice-editor"
          className="ic-proof"
          aria-label="Editable invoice"
          data-invoice-accent={accentColor}
          data-invoice-layout={invoiceLayout}
          style={invoicePaletteVars(palette)}
          hidden={!editing}
        >
          <header className="ic-doc-heading ic-sheet-columns">
            <LogoField
              key={draft.companyId}
              logo={draft.sender.logo}
              inline
              onChange={(logo) => setSender({ logo })}
            />
            <div className="ic-doc-title">
              <h3>Invoice</h3>
              <label className="ic-field">
                <span className="ic-doc-label">Invoice number</span>
                <input
                  value={draft.number}
                  maxLength={120}
                  aria-invalid={showErrors && !draft.number.trim() ? true : undefined}
                  placeholder="e.g. INV-0001"
                  onChange={(event) => set('number', event.target.value)}
                />
              </label>
              <fieldset className="ic-fields ic-sheet-dates">
                <legend className="sr-only">Invoice dates</legend>
                <label className="ic-field">
                  <span className="ic-doc-label">Issue date</span>
                  <input
                    type="date"
                    aria-invalid={showErrors && !draft.issueDate ? true : undefined}
                    value={draft.issueDate}
                    onChange={(event) => setDate('issueDate', event.target.value)}
                  />
                </label>
                <label className="ic-field">
                  <span className="ic-doc-label">Due date</span>
                  <input
                    type="date"
                    aria-invalid={
                      showErrors && Boolean(draft.dueDate && draft.dueDate < draft.issueDate)
                        ? true
                        : undefined
                    }
                    value={draft.dueDate}
                    onChange={(event) => setDate('dueDate', event.target.value)}
                  />
                </label>
              </fieldset>
            </div>
          </header>
          <div className="ic-doc-meta">
            <div className="ic-party ic-sheet-party">
              <span className="ic-doc-label">From</span>
              <ContactFields
                party="sender"
                contact={draft.sender}
                onChange={setSender}
                sheet
                invalidName={showErrors && !draft.sender.name.trim()}
              />
              {draft.sender.country && <span>{countryName(draft.sender.country)}</span>}
              <label className="ic-field">
                <span className="sr-only">Website</span>
                <input
                  maxLength={120}
                  placeholder="e.g. example.com"
                  value={draft.sender.website}
                  onChange={(event) => setSender({ website: event.target.value })}
                />
              </label>
              <label className="ic-field">
                <span className="sr-only">Tax ID</span>
                <input
                  maxLength={120}
                  placeholder="e.g. Tax ID 12345"
                  value={draft.sender.taxId}
                  onChange={(event) => setSender({ taxId: event.target.value })}
                />
              </label>
            </div>
            <div className="ic-party ic-sheet-party">
              <span className="ic-doc-label">Bill to</span>
              <ContactFields
                party="client"
                contact={draft.client}
                sheet
                invalidName={showErrors && !draft.client.name.trim()}
                onChange={(patch) =>
                  edit((current) => ({ ...current, client: { ...current.client, ...patch } }))
                }
              />
              {draft.client.country && <span>{countryName(draft.client.country)}</span>}
            </div>
          </div>
          <section aria-labelledby="sheet-lines">
            <h4 id="sheet-lines" className="ic-doc-label ic-sheet-line-heading">
              Line items
            </h4>
            <LineItems
              items={draft.items}
              edit={(update) => edit((current) => ({ ...current, items: update(current.items) }))}
              currency={draft.currency}
              caption="Invoice line items"
              empty="No line items. Add a line below or use a product from Invoice options."
              amounts={proof.lines.map((line) => line.amount)}
              showErrors={showErrors}
            />
          </section>
          <div className="ic-sheet-summary">
            <dl className="ic-summary">
              <div>
                <dt>Subtotal</dt>
                <dd>{totals ? formatMoney(totals.subtotal, draft.currency) : '—'}</dd>
              </div>
              <div className="ic-summary-input-row">
                <dt>
                  <label className="ic-summary-inline" htmlFor="sheet-discount">
                    <span>Discount</span>
                    <span className="ic-summary-control">
                      <input
                        id="sheet-discount"
                        className="ic-summary-inline-input"
                        aria-label={
                          draft.discountKind === 'percent' ? 'Discount (%)' : 'Discount amount'
                        }
                        inputMode="decimal"
                        maxLength={16}
                        aria-invalid={
                          !decimalValid(
                            draft.discount,
                            draft.discountKind === 'percent' ? 'percent' : 'amount',
                          )
                        }
                        placeholder="0"
                        value={draft.discount}
                        onChange={(event) => set('discount', event.target.value)}
                      />
                      <span className="ic-summary-unit" aria-hidden="true">
                        {draft.discountKind === 'percent' ? '%' : draft.currency}
                      </span>
                    </span>
                  </label>
                </dt>
                <dd>{totals ? formatMoney(-totals.discount, draft.currency) : '—'}</dd>
              </div>
              <div className="ic-summary-input-row">
                <dt>
                  <label className="ic-summary-inline" htmlFor="sheet-tax-rate">
                    <span>{draft.taxLabel.trim() || 'Tax'}</span>
                    <span className="ic-summary-control">
                      <input
                        id="sheet-tax-rate"
                        className="ic-summary-inline-input"
                        aria-label="Tax rate (%)"
                        inputMode="decimal"
                        maxLength={16}
                        aria-invalid={!decimalValid(draft.taxRate, 'percent')}
                        placeholder="0"
                        value={draft.taxRate}
                        onChange={(event) => set('taxRate', event.target.value)}
                      />
                      <span className="ic-summary-unit" aria-hidden="true">
                        %
                      </span>
                    </span>
                  </label>
                </dt>
                <dd>{totals ? formatMoney(totals.tax, draft.currency) : '—'}</dd>
              </div>
              <div className="ic-summary-input-row">
                <dt>
                  <label className="ic-summary-inline" htmlFor="sheet-shipping">
                    <span>Shipping</span>
                    <span className="ic-summary-control">
                      <input
                        id="sheet-shipping"
                        className="ic-summary-inline-input"
                        aria-label="Shipping"
                        inputMode="decimal"
                        maxLength={16}
                        aria-invalid={!decimalValid(draft.shipping, 'amount')}
                        placeholder="0"
                        value={draft.shipping}
                        onChange={(event) => set('shipping', event.target.value)}
                      />
                      <span className="ic-summary-unit" aria-hidden="true" />
                    </span>
                  </label>
                </dt>
                <dd>{totals ? formatMoney(totals.shipping, draft.currency) : '—'}</dd>
              </div>
              <div className="ic-amount">
                <dt>
                  Amount due <span className="ic-mono">{draft.currency}</span>
                </dt>
                <dd>{proof.total}</dd>
              </div>
            </dl>
            {proof.warning && <p className="ic-proof-warning">{proof.warning}</p>}
          </div>
          <div className="ic-doc-extras ic-sheet-extras">
            {(
              [
                { key: 'notes', label: 'Notes', placeholder: 'e.g. Thank you for your business.' },
                { key: 'terms', label: 'Terms', placeholder: 'e.g. Payment due within 14 days.' },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <label className="ic-field" key={key}>
                <span className="ic-doc-label">{label}</span>
                <textarea
                  maxLength={1500}
                  rows={1}
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
                rows={1}
                placeholder="e.g. Bank name, account number, and payment reference"
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
        <InvoicePreview
          proof={proof}
          currency={draft.currency}
          accentColor={accentColor}
          layout={invoiceLayout}
          palette={palette}
          hidden={editing}
        />
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
              {onResetDraft && (
                <button type="button" className="ic-button" onClick={onResetDraft}>
                  Reset draft
                </button>
              )}
              {onDuplicate && (
                <button type="button" className="ic-button" onClick={onDuplicate}>
                  Duplicate
                </button>
              )}
              {onDelete && (
                <button type="button" className="ic-button ic-danger" onClick={onDelete}>
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
