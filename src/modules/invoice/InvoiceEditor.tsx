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
  manualCompanyId,
  matchesProduct,
  resolveAccentColor,
  resolveInvoiceLayout,
  suggestInvoiceNumber,
  type Invoice,
  type Sender,
  type Workspace,
} from './domain/invoice'
import {
  amountCardClass,
  InvoicePreview,
  invoicePaletteVars,
  proofCardClass,
  proofHeadingVariantClass,
  summaryListBaseClass,
} from './InvoicePreview'
import {
  actionsClass,
  buttonClass,
  ContactFields,
  CountrySelect,
  CurrencySelect,
  dangerButtonClass,
  docLabelClass,
  fieldClass,
  fieldsGridClass,
  Icon,
  LogoField,
  PickerModal,
  primaryButtonClass,
  SelectField,
  sheetChipClass,
  sheetFieldLabelClass,
} from './invoice-ui'
import { LineItems } from './LineItems'

type EditInvoice = (edit: (invoice: Invoice) => Invoice) => void
type Notice = { text: string; error?: boolean }

export function InvoiceEditor({
  draft,
  workspace,
  edit,
  view,
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
  const [pickerModal, setPickerModal] = useState<'client' | 'product' | null>(null)
  const saved = workspace.invoices.some((invoice) => invoice.id === draft.id)
  const company = workspace.companies.find((entry) => entry.id === draft.companyId)
  const productSearch = productQuery.trim().toLowerCase()
  const products =
    pickerModal === 'product'
      ? workspace.products
          .filter((product) => matchesProduct(product, productSearch))
          .sort(
            (a, b) => Number(b.currency === draft.currency) - Number(a.currency === draft.currency),
          )
      : []
  const editing = view === 'edit'
  const proof = invoiceDocument(draft)
  const totals = proof.totals
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
    if (result.ok) {
      set('items', result.invoice.items)
      setProductQuery('')
      setProductError('')
      setPickerModal(null)
    } else {
      setProductError(result.message)
    }
  }

  return (
    <section
      className="ic-invoice-stage mx-auto grid w-[min(100%,940px)] min-w-0 gap-3 rounded-[14px] print:block print:w-full print:bg-white print:p-0"
      aria-labelledby="editor-title"
    >
      <h2 id="editor-title" className="sr-only">
        {editing ? 'Edit invoice' : 'Document preview'}
      </h2>
      <div
        className={`ic-sheet-tools rounded-xl border border-ic-line bg-ic-ground px-3.5 pt-3 pb-2 max-[480px]:px-2.5 max-[480px]:pt-2.5 max-[480px]:pb-1.5 print:hidden ${editing ? '' : 'hidden'}`}
        hidden={!editing}
        role="region"
        aria-label="Invoice options"
      >
        <div className="grid grid-cols-2 gap-2.5">
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
        </div>
        <details className="ic-detail mt-[3px] text-[13px] [&[open]>div]:pt-[3px] [&[open]>div]:pb-[9px]">
          <summary className="min-h-9 cursor-pointer py-[5px] font-[670] text-ic-accent">
            More options
          </summary>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 max-[620px]:grid-cols-1 max-[480px]:gap-[9px]">
            <CountrySelect
              label="Sender country"
              value={draft.sender.country}
              onChange={(country) => setSender({ country })}
            />
            <CountrySelect
              label="Billing contact country"
              value={draft.client.country}
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
            <label className={fieldClass}>
              Tax label
              <input
                maxLength={120}
                placeholder="Tax"
                value={draft.taxLabel}
                onChange={(event) => set('taxLabel', event.target.value)}
              />
            </label>
          </div>
        </details>
      </div>
      <div className="min-w-0 rounded-xl bg-ic-desk print:w-full print:bg-white print:p-0">
        <div className="p-3 max-[480px]:px-1.5 print:w-full print:bg-white print:p-0">
          <article
            id="invoice-editor"
            className={`${proofCardClass} print:hidden [&_:focus-visible]:outline-(--ic-doc-accent) ${editing ? '' : 'hidden'}`}
            aria-label="Editable invoice"
            data-invoice-accent={accentColor}
            data-invoice-layout={invoiceLayout}
            style={invoicePaletteVars(palette)}
            hidden={!editing}
          >
            <header
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] items-start gap-x-[clamp(12px,3vw,38px)] gap-y-3 max-[620px]:grid-cols-1 ${proofHeadingVariantClass}`}
            >
              <LogoField
                key={draft.companyId}
                logo={draft.sender.logo}
                inline
                onChange={(logo) => setSender({ logo })}
              />
              <div className="flex-[0_0_48%] text-right text-ic-muted max-[620px]:text-start">
                <h3 className="mb-2 font-display text-[clamp(26px,3.3vw,45px)]/[0.95] font-extrabold tracking-[-0.04em] text-(--ic-doc-accent)">
                  Invoice
                </h3>
                <label className={fieldClass}>
                  <span className={docLabelClass}>Invoice number</span>
                  <input
                    className="text-right max-[620px]:text-start"
                    value={draft.number}
                    maxLength={120}
                    aria-invalid={showErrors && !draft.number.trim() ? true : undefined}
                    placeholder="e.g. INV-0001"
                    onChange={(event) => set('number', event.target.value)}
                  />
                </label>
                <fieldset
                  className={`${fieldsGridClass} mt-2 text-start max-[620px]:text-start max-[360px]:grid-cols-1`}
                >
                  <legend className="sr-only">Invoice dates</legend>
                  <label className={fieldClass}>
                    <span className={docLabelClass}>Issue date</span>
                    <input
                      type="date"
                      aria-invalid={showErrors && !draft.issueDate ? true : undefined}
                      value={draft.issueDate}
                      onChange={(event) => setDate('issueDate', event.target.value)}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span className={docLabelClass}>Due date</span>
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
            <div className="grid grid-cols-2 items-start gap-x-[clamp(12px,3vw,38px)] gap-y-3 py-[21px] max-[620px]:grid-cols-1">
              <div className="grid min-w-0 gap-0.5 text-xs whitespace-pre-line">
                <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
                  <span className={docLabelClass}>From</span>
                </div>
                <ContactFields
                  party="sender"
                  contact={draft.sender}
                  onChange={setSender}
                  sheet
                  invalidName={showErrors && !draft.sender.name.trim()}
                />
                {draft.sender.country && <span>{countryName(draft.sender.country)}</span>}
                <label className={sheetFieldLabelClass}>
                  <span className="sr-only">Website</span>
                  <input
                    maxLength={120}
                    className="min-h-[22px] py-px leading-[1.45]"
                    placeholder="e.g. example.com"
                    value={draft.sender.website}
                    onChange={(event) => setSender({ website: event.target.value })}
                  />
                </label>
                <label className={sheetFieldLabelClass}>
                  <span className="sr-only">Tax ID</span>
                  <input
                    maxLength={120}
                    className="min-h-[22px] py-px leading-[1.45]"
                    placeholder="e.g. Tax ID 12345"
                    value={draft.sender.taxId}
                    onChange={(event) => setSender({ taxId: event.target.value })}
                  />
                </label>
              </div>
              <div className="grid min-w-0 gap-0.5 text-xs whitespace-pre-line">
                <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
                  <span className={docLabelClass}>Bill to</span>
                  <button
                    type="button"
                    className={sheetChipClass}
                    onClick={() => setPickerModal('client')}
                  >
                    Use saved client
                  </button>
                </div>
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
              <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 py-2">
                <h4 id="sheet-lines" className={docLabelClass}>
                  Line items
                </h4>
                <button
                  type="button"
                  className={sheetChipClass}
                  onClick={() => {
                    setProductQuery('')
                    setProductError('')
                    setPickerModal('product')
                  }}
                >
                  <Icon name="plus" className="size-3 flex-none" /> Add product
                </button>
              </div>
              <LineItems
                items={draft.items}
                edit={(update) => edit((current) => ({ ...current, items: update(current.items) }))}
                currency={draft.currency}
                caption="Invoice line items"
                empty="No line items. Add a line below or use Add product."
                amounts={proof.lines.map((line) => line.amount)}
                showErrors={showErrors}
              />
            </section>
            <div className="ic-sheet-summary mt-[18px] grid justify-items-stretch border-t border-(--ic-doc-line) pt-3 max-[620px]:grid-cols-1">
              <dl
                className={`${summaryListBaseClass} w-full [&>div:not(.ic-amount)]:w-[min(100%,360px)] [&>div:not(.ic-amount)]:items-center [&>div:not(.ic-amount)]:gap-3`}
              >
                <div>
                  <dt>Subtotal</dt>
                  <dd>{totals ? formatMoney(totals.subtotal, draft.currency) : '—'}</dd>
                </div>
                <div className="ic-summary-input-row">
                  <dt className="flex max-w-[216px] min-w-0 flex-1 items-center justify-between gap-2">
                    <label
                      className="inline-flex min-w-0 flex-1 items-center justify-between gap-2"
                      htmlFor="sheet-discount"
                    >
                      <span>Discount</span>
                      <span className="inline-flex shrink-0 items-center gap-1">
                        <input
                          id="sheet-discount"
                          className="min-h-[26px] w-[68px] shrink-0 px-1 py-0.5 text-right tabular-nums max-[480px]:w-14"
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
                        <span
                          className="ic-summary-unit w-9 shrink-0 text-left text-[11px] font-semibold [overflow-wrap:normal] whitespace-nowrap text-ic-muted max-[480px]:w-8"
                          aria-hidden="true"
                        >
                          {draft.discountKind === 'percent' ? '%' : draft.currency}
                        </span>
                      </span>
                    </label>
                  </dt>
                  <dd>{totals ? formatMoney(-totals.discount, draft.currency) : '—'}</dd>
                </div>
                <div className="ic-summary-input-row">
                  <dt className="flex max-w-[216px] min-w-0 flex-1 items-center justify-between gap-2">
                    <label
                      className="inline-flex min-w-0 flex-1 items-center justify-between gap-2"
                      htmlFor="sheet-tax-rate"
                    >
                      <span>{draft.taxLabel.trim() || 'Tax'}</span>
                      <span className="inline-flex shrink-0 items-center gap-1">
                        <input
                          id="sheet-tax-rate"
                          className="min-h-[26px] w-[68px] shrink-0 px-1 py-0.5 text-right tabular-nums max-[480px]:w-14"
                          aria-label="Tax rate (%)"
                          inputMode="decimal"
                          maxLength={16}
                          aria-invalid={!decimalValid(draft.taxRate, 'percent')}
                          placeholder="0"
                          value={draft.taxRate}
                          onChange={(event) => set('taxRate', event.target.value)}
                        />
                        <span
                          className="ic-summary-unit w-9 shrink-0 text-left text-[11px] font-semibold [overflow-wrap:normal] whitespace-nowrap text-ic-muted max-[480px]:w-8"
                          aria-hidden="true"
                        >
                          %
                        </span>
                      </span>
                    </label>
                  </dt>
                  <dd>{totals ? formatMoney(totals.tax, draft.currency) : '—'}</dd>
                </div>
                <div className="ic-summary-input-row">
                  <dt className="flex max-w-[216px] min-w-0 flex-1 items-center justify-between gap-2">
                    <label
                      className="inline-flex min-w-0 flex-1 items-center justify-between gap-2"
                      htmlFor="sheet-shipping"
                    >
                      <span>Shipping</span>
                      <span className="inline-flex shrink-0 items-center gap-1">
                        <input
                          id="sheet-shipping"
                          className="min-h-[26px] w-[68px] shrink-0 px-1 py-0.5 text-right tabular-nums max-[480px]:w-14"
                          aria-label="Shipping"
                          inputMode="decimal"
                          maxLength={16}
                          aria-invalid={!decimalValid(draft.shipping, 'amount')}
                          placeholder="0"
                          value={draft.shipping}
                          onChange={(event) => set('shipping', event.target.value)}
                        />
                        <span
                          className="ic-summary-unit w-9 shrink-0 text-left text-[11px] font-semibold [overflow-wrap:normal] whitespace-nowrap text-ic-muted max-[480px]:w-8"
                          aria-hidden="true"
                        >
                          {draft.currency}
                        </span>
                      </span>
                    </label>
                  </dt>
                  <dd>{totals ? formatMoney(totals.shipping, draft.currency) : '—'}</dd>
                </div>
                <div className={amountCardClass}>
                  <dt className="shrink-0 font-display text-[15px]/[1.1] font-[750] whitespace-nowrap">
                    Amount due{' '}
                    <span className="mt-1 block font-mono text-xs/[1.4]">{draft.currency}</span>
                  </dt>
                  <dd className="ml-auto font-display text-[clamp(18px,2.8vw,30px)]/[1.08] font-extrabold tracking-[-0.025em] [overflow-wrap:normal] [word-break:normal] whitespace-nowrap">
                    {proof.total}
                  </dd>
                </div>
              </dl>
              {proof.warning && <p className="mt-2.5 text-xs text-ic-error">{proof.warning}</p>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-ic-line pt-4 text-xs whitespace-pre-line max-[620px]:grid-cols-1">
              {(
                [
                  {
                    key: 'notes',
                    label: 'Notes',
                    placeholder: 'e.g. Thank you for your business.',
                  },
                  { key: 'terms', label: 'Terms', placeholder: 'e.g. Payment due within 14 days.' },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <label
                  className="relative grid min-w-0 content-start gap-[5px] text-xs font-normal"
                  key={key}
                >
                  <span className={docLabelClass}>{label}</span>
                  <textarea
                    maxLength={1500}
                    rows={1}
                    placeholder={placeholder}
                    value={draft[key]}
                    onChange={(event) => set(key, event.target.value)}
                  />
                </label>
              ))}
              <label className="relative col-span-full grid min-w-0 content-start gap-[5px] text-xs font-normal">
                <span className={docLabelClass}>Payment details</span>
                <textarea
                  maxLength={1500}
                  rows={1}
                  placeholder="e.g. Bank name, account number, and payment reference"
                  value={draft.sender.paymentDetails}
                  onChange={(event) => setSender({ paymentDetails: event.target.value })}
                />
              </label>
            </div>
            <footer className="mt-8 flex justify-between gap-3 border-t border-(--ic-doc-line) pt-[9px] text-[11px] text-ic-muted">
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
        <div className="grid gap-2.5 px-3 pb-3 text-xs max-[480px]:px-1.5 print:hidden">
          {notice && (
            <p
              className={`rounded-md bg-ic-surface px-2.5 py-2 ${notice.error ? 'ic-error text-ic-error' : 'text-ic-muted'}`}
              role={notice.error ? 'alert' : 'status'}
            >
              {notice.text}
            </p>
          )}
          <div
            className={`${actionsClass} max-[620px]:grid max-[620px]:grid-cols-2 max-[620px]:[&>button]:w-full max-[620px]:[&>button]:min-w-0 max-[620px]:[&>button]:justify-center max-[480px]:[&>button]:px-2.5`}
          >
            {editing && (
              <>
                <button
                  type="button"
                  className={`${primaryButtonClass} ${saved || !onResetDraft ? 'max-[620px]:col-span-full' : ''}`}
                  onClick={onSave}
                >
                  {saved ? 'Save changes' : 'Create invoice'}
                </button>
                {onResetDraft && (
                  <button type="button" className={buttonClass} onClick={onResetDraft}>
                    Reset draft
                  </button>
                )}
                {onDuplicate && (
                  <button type="button" className={buttonClass} onClick={onDuplicate}>
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <button type="button" className={dangerButtonClass} onClick={onDelete}>
                    Delete
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className={`${buttonClass} ms-auto max-[620px]:col-span-full max-[620px]:ms-0`}
              disabled={pdfBusy}
              onClick={onDownload}
            >
              <Icon name="download" /> {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
      <ClientPicker
        open={pickerModal === 'client'}
        invoices={workspace.invoices}
        onChange={(client) => set('client', client)}
        onClose={() => setPickerModal(null)}
      />
      <PickerModal
        open={pickerModal === 'product'}
        title="Add product"
        description="Add all line items from a saved product in this invoice currency."
        searchLabel="Search products"
        placeholder="Product or item"
        empty={
          workspace.products.length
            ? 'No matching products.'
            : 'No products yet. Add one in Products.'
        }
        actionLabel="Add"
        query={productQuery}
        options={products.map((product) => ({
          value: product.id,
          label: product.name,
          detail: `${product.items.length} ${product.items.length === 1 ? 'item' : 'items'} · ${product.currency}${product.currency === draft.currency ? '' : ' (different currency)'}`,
        }))}
        error={productError || undefined}
        onQuery={(query) => {
          setProductQuery(query)
          setProductError('')
        }}
        onSelect={selectProduct}
        onClose={() => {
          setProductQuery('')
          setProductError('')
          setPickerModal(null)
        }}
      />
    </section>
  )
}
