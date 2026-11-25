import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  formatBytes,
  formatDate,
  formatMoney,
  invoiceSenderKey,
  invoiceTotals,
  maxBackupBytes,
  maxCompanies,
  maxInvoices,
  maxProducts,
  newCompany,
  type Company,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import {
  actionsClass,
  buttonClass,
  CurrencySelect,
  dangerButtonClass,
  DecimalField,
  fieldClass,
  fieldsGridClass,
  Icon,
  panelClass,
  primaryButtonClass,
  recordRowBaseClass,
  recordTriggerClass,
  SelectField,
  SenderFields,
  shouldOpenRecordRow,
  textButtonClass,
  WorkspaceDialog,
  type ConfirmState,
} from './invoice-ui'
import { decodeWorkspace, downloadFile } from './workspace.browser'

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
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3.5 px-[22px] py-5 max-[720px]:grid-cols-1 max-[720px]:gap-2 max-[480px]:px-3.5">
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
        <p className="px-[22px] pb-3 text-xs text-ic-muted max-[480px]:px-3.5">
          Showing {first + 1}–{first + visible.length} of {filtered.length} invoices · Newest issue
          date first
        </p>
      )}
      {workspace.invoices.length === 0 ? (
        <div className="px-[22px] py-[21px] max-[480px]:px-3.5">
          <h2>No saved invoices yet</h2>
          <p className="mt-2 mb-3.5 text-ic-muted">
            Save your first invoice to keep it in your local history.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-[22px] py-[21px] max-[480px]:px-3.5">No invoices match these filters.</p>
      ) : (
        <ul className="list-none">
          {visible.map((invoice) => {
            const totals = invoiceTotals(invoice)
            return (
              <li
                className={`${recordRowBaseClass} grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)_auto] max-[620px]:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]`}
                key={invoice.id}
                onClick={(event) => {
                  if (shouldOpenRecordRow(event)) open(invoice)
                }}
              >
                <div>
                  <button
                    className={`${recordTriggerClass} font-mono text-[13px]/[1.4]`}
                    type="button"
                    onClick={() => open(invoice)}
                  >
                    {invoice.number}
                  </button>
                  <h2>{invoice.client.name}</h2>
                  <p className="mt-[5px] text-xs text-ic-muted">
                    {invoice.sender.name} · {formatDate(invoice.issueDate)}
                  </p>
                </div>
                <div className="ic-record-total flex flex-col items-start gap-1.5 tabular-nums">
                  <strong>{totals && formatMoney(totals.total, invoice.currency)}</strong>
                </div>
                <div className={`${actionsClass} cursor-default max-[620px]:col-span-full`}>
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
                    className={buttonClass}
                    type="button"
                    aria-label={`Duplicate ${invoice.number}`}
                    onClick={() => duplicate(invoice)}
                  >
                    Duplicate
                  </button>
                  <button
                    className={textButtonClass}
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
      )}
      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between gap-2.5 border-t border-ic-line px-[18px] py-3"
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

export function Companies({
  companies,
  save,
  remove,
}: {
  companies: Company[]
  save: (company: Company) => { ok: true } | { ok: false; message?: string }
  remove: (company: Company) => void
}) {
  const [selected, setSelected] = useState<Company | null>(null)
  const [error, setError] = useState('')
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()
  const matches = companies.filter(({ sender, currency }) =>
    [sender.name, currency].some((value) => value.toLowerCase().includes(search)),
  )
  function edit(company: Company | null) {
    setSelected(company)
    setError('')
    setSaveAttempted(false)
  }
  function updateCompany(patch: Partial<Company>) {
    setSelected((current) => (current ? { ...current, ...patch } : current))
    setError('')
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const result = save(selected)
    if (result.ok) edit(null)
    else {
      setSaveAttempted(true)
      setError(result.message ?? 'Company could not be saved. Check browser storage and try again.')
    }
  }
  return (
    <section className={panelClass} aria-labelledby="companies-title">
      <h2 id="companies-title" className="sr-only">
        Companies
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-3 px-[22px] py-[21px] max-[480px]:px-3.5">
        <label className={`${fieldClass} flex-[0_1_300px]`}>
          Search companies
          <input
            type="search"
            value={query}
            placeholder="Name or currency"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={companies.length >= maxCompanies}
          onClick={() => edit(newCompany())}
        >
          <Icon name="plus" /> Add company
        </button>
      </div>
      <ul className="list-none">
        {matches.map((company) => (
          <li
            key={company.id}
            className={`${recordRowBaseClass} grid-cols-[minmax(0,1fr)_auto]`}
            onClick={(event) => {
              if (shouldOpenRecordRow(event)) edit(company)
            }}
          >
            <div>
              <h3>
                <button className={recordTriggerClass} type="button" onClick={() => edit(company)}>
                  {company.sender.name}
                </button>
              </h3>
              <p className="mt-[5px] text-xs text-ic-muted">{company.currency}</p>
            </div>
            <div className={`${actionsClass} cursor-default max-[620px]:col-span-full`}>
              <button
                className={textButtonClass}
                type="button"
                aria-label={`Delete ${company.sender.name}`}
                onClick={() => remove(company)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {matches.length === 0 && (
        <p className="px-[22px] py-[21px] max-[480px]:px-3.5">
          {companies.length
            ? 'No companies match this search.'
            : 'No companies yet. Add one to reuse its sender details.'}
        </p>
      )}
      <WorkspaceDialog
        open={selected !== null}
        title={companies.some(({ id }) => id === selected?.id) ? 'Edit company' : 'New company'}
        description="Set sender details, numbering, and defaults for new invoices."
        onClose={() => edit(null)}
      >
        {selected && (
          <form className="mt-4" noValidate onSubmit={submit}>
            <div className={fieldsGridClass}>
              <SenderFields
                key={selected.id}
                sender={selected.sender}
                invalidName={saveAttempted && !selected.sender.name.trim()}
                onChange={(patch) => {
                  setSelected((current) =>
                    current?.id === selected.id
                      ? { ...current, sender: { ...current.sender, ...patch } }
                      : current,
                  )
                  setError('')
                }}
              />
              <CurrencySelect
                label="Default currency"
                value={selected.currency}
                onChange={(currency) => updateCompany({ currency })}
              />
              <label className={fieldClass}>
                Invoice prefix
                <input
                  maxLength={24}
                  value={selected.prefix}
                  onChange={(event) => updateCompany({ prefix: event.target.value })}
                />
              </label>
              <label className={fieldClass}>
                Next number
                <input
                  type="number"
                  min={1}
                  max={1000001}
                  required
                  aria-invalid={
                    saveAttempted &&
                    (!Number.isInteger(selected.nextNumber) ||
                      selected.nextNumber < 1 ||
                      selected.nextNumber > 1_000_001)
                      ? true
                      : undefined
                  }
                  value={selected.nextNumber || ''}
                  onChange={(event) => updateCompany({ nextNumber: Number(event.target.value) })}
                />
              </label>
              <label className={fieldClass}>
                Number padding
                <input
                  type="number"
                  min={1}
                  max={8}
                  required
                  aria-invalid={
                    saveAttempted &&
                    (!Number.isInteger(selected.padding) ||
                      selected.padding < 1 ||
                      selected.padding > 8)
                      ? true
                      : undefined
                  }
                  value={selected.padding || ''}
                  onChange={(event) => updateCompany({ padding: Number(event.target.value) })}
                />
              </label>
              <label className={fieldClass}>
                Default tax label
                <input
                  maxLength={120}
                  value={selected.taxLabel}
                  onChange={(event) => updateCompany({ taxLabel: event.target.value })}
                />
              </label>
              <DecimalField
                label="Default tax rate (%)"
                kind="percent"
                value={selected.taxRate}
                onChange={(taxRate) => updateCompany({ taxRate })}
              />
              {(['notes', 'terms'] as const).map((key) => (
                <label key={key} className={`${fieldClass} col-span-full`}>
                  {key === 'notes' ? 'Default notes' : 'Default terms'}
                  <textarea
                    maxLength={1500}
                    rows={2}
                    value={selected[key]}
                    onChange={(event) => updateCompany({ [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            {error && (
              <p className="ic-error mt-2 text-ic-error" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button className={buttonClass} type="button" onClick={() => edit(null)}>
                Cancel
              </button>
              <button className={primaryButtonClass} type="submit">
                Save company
              </button>
            </div>
          </form>
        )}
      </WorkspaceDialog>
    </section>
  )
}

const statCapClass = 'text-[13px] font-medium text-ic-muted'
const statValueClass = 'mt-1 font-mono text-[17px]/[1.4] font-[740] tabular-nums'
const statLabelClass = 'text-xs font-semibold text-ic-muted'

export function Backup({
  workspace,
  storageBytes,
  damaged,
  restore,
  clear,
  requestConfirm,
}: {
  workspace: Workspace
  storageBytes: number
  damaged: string | null
  restore: (data: Workspace) => boolean
  clear: () => boolean
  requestConfirm: (confirm: ConfirmState) => void
}) {
  const [error, setError] = useState('')
  const importAttempt = useRef(0)
  useEffect(
    () => () => {
      importAttempt.current += 1
    },
    [],
  )
  return (
    <div className="mt-4 grid gap-4">
      <section aria-label="Local storage">
        <h2 className="mt-0 mb-2 text-[11px] font-bold tracking-[0.06em] text-ic-muted uppercase">
          Local storage
        </h2>
        <dl className="grid grid-cols-4 overflow-hidden rounded-[10px] border border-ic-line bg-ic-field max-[620px]:grid-cols-2">
          <div className="min-w-0 px-3.5 py-3">
            <dt className={statLabelClass}>Saved invoices</dt>
            <dd className={statValueClass}>
              {workspace.invoices.length}
              <span className={statCapClass}> / {maxInvoices}</span>
            </dd>
          </div>
          <div className="min-w-0 border-l border-ic-line px-3.5 py-3">
            <dt className={statLabelClass}>Sender profiles</dt>
            <dd className={statValueClass}>
              {workspace.companies.length}
              <span className={statCapClass}> / {maxCompanies}</span>
            </dd>
          </div>
          <div className="min-w-0 border-l border-ic-line px-3.5 py-3 max-[620px]:border-t max-[620px]:border-l-0">
            <dt className={statLabelClass}>Products</dt>
            <dd className={statValueClass}>
              {workspace.products.length}
              <span className={statCapClass}> / {maxProducts}</span>
            </dd>
          </div>
          <div className="min-w-0 border-l border-ic-line px-3.5 py-3 max-[620px]:border-t">
            <dt className={statLabelClass}>Storage used</dt>
            <dd className={statValueClass}>{formatBytes(storageBytes)}</dd>
          </div>
        </dl>
      </section>
      <div className="grid grid-cols-2 items-stretch gap-3.5 max-[620px]:grid-cols-1">
        <section className="flex flex-col rounded-[10px] border border-ic-line bg-ic-surface p-[18px]">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-ic-soft text-ic-accent"
              aria-hidden="true"
            >
              <Icon name="download" />
            </span>
            <h2 className="m-0 font-display text-[15px]/tight font-[720] text-ic-ink">
              Export a backup
            </h2>
          </div>
          <p className="mt-2 text-[13px]/normal text-ic-muted">
            Download a JSON copy of saved invoices, company profiles, products, and settings. Store
            it somewhere private.
          </p>
          <div className={`${actionsClass} mt-auto pt-3.5`}>
            <button
              className={primaryButtonClass}
              type="button"
              onClick={() =>
                downloadFile(
                  new Blob([JSON.stringify(workspace)], { type: 'application/json' }),
                  'invoice-core-backup.json',
                )
              }
            >
              <Icon name="download" /> Download backup
            </button>
            {damaged !== null && (
              <button
                className={buttonClass}
                type="button"
                onClick={() =>
                  downloadFile(
                    new Blob([damaged], { type: 'text/plain' }),
                    'invoice-core-unreadable.txt',
                  )
                }
              >
                Download unreadable data
              </button>
            )}
          </div>
        </section>
        <section className="flex flex-col rounded-[10px] border border-ic-line bg-ic-surface p-[18px]">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-ic-soft text-ic-accent"
              aria-hidden="true"
            >
              <Icon name="upload" />
            </span>
            <h2 className="m-0 font-display text-[15px]/tight font-[720] text-ic-ink">
              Restore a backup
            </h2>
          </div>
          <p className="mt-2 text-[13px]/normal text-ic-muted">
            Restore replaces the local workspace. Download a backup of what you have first.
          </p>
          <div className="mt-auto pt-3.5">
            <label className="relative flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-ic-accent/45 bg-ic-field px-3 py-2 text-ic-accent transition-[border-color,background-color] duration-140 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ic-accent hover:border-ic-accent hover:bg-ic-soft">
              <Icon name="upload" />
              <span className="grid min-w-0 gap-px" aria-hidden="true">
                <strong className="text-[13px]/[1.25] font-bold text-ic-ink">
                  Choose backup file
                </strong>
                <span className="text-xs/[1.25] text-ic-muted">.json up to 8 MB</span>
              </span>
              <input
                type="file"
                className="absolute inset-0 size-full min-h-0 cursor-pointer border-0 p-0 opacity-0"
                aria-label="Invoice Core backup file"
                accept="application/json,.json"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ''
                  const attempt = ++importAttempt.current
                  setError('')
                  if (!file) return
                  try {
                    const data =
                      file.size <= maxBackupBytes ? decodeWorkspace(await file.text()) : null
                    if (attempt !== importAttempt.current) return
                    if (data) {
                      requestConfirm({
                        title: 'Restore backup?',
                        description: `${data.invoices.length} saved invoice(s), ${data.companies.length} sender profile(s), and ${data.products.length} product(s). Replace the local workspace with this backup?`,
                        confirmLabel: 'Replace local workspace',
                        cancelLabel: 'Cancel restore',
                        danger: true,
                        onConfirm: () => {
                          restore(data)
                        },
                      })
                    } else {
                      setError(
                        'This is not a valid Invoice Core backup (maximum 8 MB). Nothing was replaced.',
                      )
                    }
                  } catch {
                    if (attempt === importAttempt.current)
                      setError('The file could not be read. Nothing was replaced.')
                  }
                }}
              />
            </label>
          </div>
          {error && (
            <p className="ic-error mt-2 text-ic-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      <section
        className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-l-[3px] border-ic-error/28 border-l-ic-error bg-ic-surface px-[18px] py-4"
        aria-label="Reset local data"
      >
        <div className="min-w-0 flex-[1_1_280px]">
          <h2 className="m-0 font-display text-[15px]/tight font-[720] text-ic-ink">
            Reset local data
          </h2>
          <p className="mt-2 text-[13px]/normal text-ic-muted">
            Remove all saved invoices, sender profiles, and products from this browser. Export a
            JSON backup first.
          </p>
        </div>
        <button
          className={`${dangerButtonClass} shrink-0`}
          type="button"
          onClick={() =>
            requestConfirm({
              title: 'Clear local workspace?',
              description: `This removes ${workspace.invoices.length} saved invoice(s), ${workspace.companies.length} sender profile(s), and ${workspace.products.length} product(s) from this browser. Download a JSON backup first.`,
              confirmLabel: 'Confirm clear workspace',
              cancelLabel: 'Cancel clear',
              danger: true,
              onConfirm: () => {
                if (clear()) setError('')
              },
            })
          }
        >
          Clear local workspace
        </button>
      </section>
    </div>
  )
}
