import { useState } from 'react'
import {
  formatDate,
  formatMoney,
  invoiceSenderKey,
  invoiceTotals,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import {
  actionsClass,
  buttonClass,
  dangerTextButtonClass,
  fieldClass,
  Icon,
  panelClass,
  recordRowBaseClass,
  recordTriggerClass,
  SelectField,
  shouldOpenRecordRow,
  textButtonClass,
} from './invoice-ui'

export { Companies } from './CompaniesPanel'
export { Backup } from './BackupPanel'

export function InvoiceHistory({
  workspace,
  pdfBusyId,
  open,
  downloadPdf,
  duplicate,
  remove,
}: {
  workspace: Workspace
  pdfBusyId: string | null
  open: (invoice: Invoice) => void
  downloadPdf: (invoice: Invoice) => void
  duplicate: (invoice: Invoice) => void
  remove: (invoice: Invoice) => void
}) {
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState('')
  const [page, setPage] = useState(1)
  const choices = new Map(workspace.companies.map((company) => [company.id, company.sender.name]))
  for (const invoice of workspace.invoices)
    if (!choices.has(invoiceSenderKey(invoice)))
      choices.set(invoiceSenderKey(invoice), invoice.sender.name)
  const search = query.trim().toLowerCase()
  const filtered = workspace.invoices
    .filter(
      (invoice) =>
        (!profile || invoiceSenderKey(invoice) === profile) &&
        [invoice.number, invoice.client.name, invoice.sender.name].some((value) =>
          value.toLowerCase().includes(search),
        ),
    )
    .sort(
      (a, b) => b.issueDate.localeCompare(a.issueDate) || b.updatedAt.localeCompare(a.updatedAt),
    )
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const first = (currentPage - 1) * pageSize
  const visible = filtered.slice(first, first + pageSize)
  return (
    <section className={panelClass} aria-label="Invoice history">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-3 border-b border-ic-line bg-ic-field px-4 py-3.5 max-[720px]:grid-cols-1 max-[720px]:gap-2 max-[480px]:px-3.5">
        <label className={fieldClass}>
          Search invoices
          <input
            type="search"
            value={query}
            placeholder="Number, client, or company"
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <SelectField
          label="Filter by company"
          value={profile}
          options={[
            { value: '', label: 'All companies' },
            ...Array.from(choices, ([id, name]) => ({ value: id, label: name })),
          ]}
          onChange={(value) => {
            setProfile(value)
            setPage(1)
          }}
        />
      </div>
      {filtered.length > 0 && (
        <p className="border-b border-ic-line bg-ic-surface px-4 py-2 text-xs text-ic-muted max-[480px]:px-3.5">
          Showing {first + 1}–{first + visible.length} of {filtered.length} invoices · Newest issue
          date first
        </p>
      )}
      {workspace.invoices.length === 0 ? (
        <div className="px-4 py-5 max-[480px]:px-3.5">
          <h2 className="text-base">No saved invoices yet</h2>
          <p className="mt-1.5 text-[13px] text-ic-muted">
            Save your first invoice to keep it in your local history.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-ic-muted max-[480px]:px-3.5">
          No invoices match these filters.
        </p>
      ) : (
        <>
          <div
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,130px)_236px] items-center gap-3.5 bg-ic-field px-4 py-2 text-[11px] font-bold tracking-[0.05em] text-ic-muted uppercase max-[720px]:hidden"
            aria-hidden="true"
          >
            <span>Invoice &amp; client</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="list-none">
            {visible.map((invoice) => {
              const totals = invoiceTotals(invoice)
              return (
                <li
                  className={`${recordRowBaseClass} grid-cols-[minmax(0,1fr)_minmax(0,130px)_236px] max-[720px]:grid-cols-[minmax(0,1fr)_auto] max-[720px]:items-start`}
                  key={invoice.id}
                  onClick={(event) => {
                    if (shouldOpenRecordRow(event)) open(invoice)
                  }}
                >
                  <div className="flex min-w-0 items-center gap-4 max-[720px]:block">
                    <div className="min-w-[100px] shrink-0 max-[720px]:mb-0.5 max-[720px]:min-w-0">
                      <button
                        className={`${recordTriggerClass} font-mono text-[13px]/[1.4]`}
                        type="button"
                        onClick={() => open(invoice)}
                      >
                        {invoice.number}
                      </button>
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-sans text-sm/snug font-semibold text-ic-ink">
                        {invoice.client.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-ic-muted">
                        {invoice.sender.name} · {formatDate(invoice.issueDate)}
                        {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="ic-record-total text-right font-mono text-[13.5px] font-semibold text-ic-ink tabular-nums">
                    <strong>{totals && formatMoney(totals.total, invoice.currency)}</strong>
                  </div>
                  <div
                    className={`${actionsClass} cursor-default justify-end max-[720px]:col-span-full max-[720px]:justify-start min-[721px]:flex-nowrap`}
                  >
                    <button
                      className={buttonClass}
                      type="button"
                      aria-label={`Download PDF for ${invoice.number}`}
                      disabled={pdfBusyId !== null}
                      onClick={() => downloadPdf(invoice)}
                    >
                      <Icon name="download" /> {pdfBusyId === invoice.id ? 'Preparing…' : 'PDF'}
                    </button>
                    <button
                      className={textButtonClass}
                      type="button"
                      aria-label={`Duplicate ${invoice.number}`}
                      onClick={() => duplicate(invoice)}
                    >
                      Duplicate
                    </button>
                    <button
                      className={dangerTextButtonClass}
                      type="button"
                      aria-label={`Delete ${invoice.number}`}
                      onClick={() => remove(invoice)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between gap-2.5 border-t border-ic-line bg-ic-field px-4 py-2.5 text-xs text-ic-muted"
          aria-label="Invoice history pages"
        >
          <button
            className={buttonClass}
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span role="status">
            Page {currentPage} of {pageCount}
          </span>
          <button
            className={buttonClass}
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  )
}
