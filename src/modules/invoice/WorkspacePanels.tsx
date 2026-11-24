import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  companyError,
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
  type Theme,
  type Workspace,
} from './domain/invoice'
import {
  CurrencySelect,
  DecimalField,
  Icon,
  SelectField,
  SenderFields,
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
    <section className="ic-editor ic-panel" aria-label="Invoice history">
      <div className="ic-filter">
        <label className="ic-field">
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
        <p className="ic-history-meta">
          Showing {first + 1}–{first + visible.length} of {filtered.length} invoices · Newest issue
          date first
        </p>
      )}
      {workspace.invoices.length === 0 ? (
        <div className="ic-empty">
          <h2>No saved invoices yet</h2>
          <p>Save your first invoice to keep it in your local history.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="ic-empty">No invoices match these filters.</p>
      ) : (
        <ul className="ic-records">
          {visible.map((invoice) => {
            const totals = invoiceTotals(invoice)
            return (
              <li className="ic-record" key={invoice.id}>
                <div>
                  <button
                    className="ic-text-button ic-mono"
                    type="button"
                    onClick={() => open(invoice)}
                  >
                    {invoice.number}
                  </button>
                  <h2>{invoice.client.name}</h2>
                  <p>
                    {invoice.sender.name} · {formatDate(invoice.issueDate)}
                  </p>
                </div>
                <div className="ic-record-total">
                  <strong>{totals && formatMoney(totals.total, invoice.currency)}</strong>
                </div>
                <div className="ic-actions">
                  <button
                    className="ic-button"
                    type="button"
                    aria-label={`Download PDF for ${invoice.number}`}
                    disabled={pdfBusyId !== null}
                    onClick={() => downloadPdf(invoice)}
                  >
                    <Icon name="download" /> {pdfBusyId === invoice.id ? 'Preparing…' : 'PDF'}
                  </button>
                  <button
                    className="ic-button"
                    type="button"
                    aria-label={`Duplicate ${invoice.number}`}
                    onClick={() => duplicate(invoice)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="ic-text-button"
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
        <nav className="ic-pagination" aria-label="Invoice history pages">
          <button
            className="ic-button"
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
            className="ic-button"
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
  theme,
}: {
  companies: Company[]
  save: (company: Company) => boolean
  remove: (company: Company) => void
  theme: Theme
}) {
  const [selected, setSelected] = useState<Company | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()
  const matches = companies.filter(({ sender, currency }) =>
    [sender.name, currency].some((value) => value.toLowerCase().includes(search)),
  )
  function edit(company: Company | null) {
    setSelected(company)
    setError('')
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const problem = companyError(selected)
    if (problem) {
      setError(problem)
      return
    }
    if (save(selected)) edit(null)
    else setError('Company could not be saved. Check browser storage and try again.')
  }
  return (
    <section className="ic-editor ic-panel ic-master-panel" aria-labelledby="companies-title">
      <div className="ic-panel-bar">
        <h2 id="companies-title">Companies</h2>
      </div>
      <div className="ic-master-toolbar ic-panel-pad">
        <label className="ic-field">
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
          className="ic-button ic-primary"
          disabled={companies.length >= maxCompanies}
          onClick={() => edit(newCompany())}
        >
          <Icon name="plus" /> Add company
        </button>
      </div>
      <ul className="ic-records">
        {matches.map((company) => (
          <li key={company.id} className="ic-record">
            <div>
              <h3>{company.sender.name}</h3>
              <p>{company.currency}</p>
            </div>
            <div className="ic-actions">
              <button
                className="ic-button"
                type="button"
                aria-label={`Edit ${company.sender.name}`}
                onClick={() => edit(company)}
              >
                Edit
              </button>
              <button
                className="ic-text-button"
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
        <p className="ic-empty">
          {companies.length
            ? 'No companies match this search.'
            : 'No companies yet. Add one to reuse its sender details.'}
        </p>
      )}
      <WorkspaceDialog
        open={selected !== null}
        title={companies.some(({ id }) => id === selected?.id) ? 'Edit company' : 'New company'}
        description="Set sender details, numbering, and defaults for new invoices."
        theme={theme}
        onClose={() => edit(null)}
      >
        {selected && (
          <form className="ic-dialog-body" onSubmit={submit}>
            <div className="ic-fields">
              <SenderFields
                key={selected.id}
                sender={selected.sender}
                theme={theme}
                onChange={(patch) =>
                  setSelected((current) =>
                    current?.id === selected.id
                      ? { ...current, sender: { ...current.sender, ...patch } }
                      : current,
                  )
                }
              />
              <CurrencySelect
                label="Default currency"
                value={selected.currency}
                onChange={(currency) => setSelected({ ...selected, currency })}
              />
              <label className="ic-field">
                Invoice prefix
                <input
                  maxLength={24}
                  value={selected.prefix}
                  onChange={(event) => setSelected({ ...selected, prefix: event.target.value })}
                />
              </label>
              <label className="ic-field">
                Next number
                <input
                  type="number"
                  min={1}
                  max={1000001}
                  required
                  value={selected.nextNumber || ''}
                  onChange={(event) =>
                    setSelected({ ...selected, nextNumber: Number(event.target.value) })
                  }
                />
              </label>
              <label className="ic-field">
                Number padding
                <input
                  type="number"
                  min={1}
                  max={8}
                  required
                  value={selected.padding || ''}
                  onChange={(event) =>
                    setSelected({ ...selected, padding: Number(event.target.value) })
                  }
                />
              </label>
              <label className="ic-field">
                Default tax label
                <input
                  maxLength={120}
                  value={selected.taxLabel}
                  onChange={(event) => setSelected({ ...selected, taxLabel: event.target.value })}
                />
              </label>
              <DecimalField
                label="Default tax rate (%)"
                kind="percent"
                value={selected.taxRate}
                onChange={(taxRate) => setSelected({ ...selected, taxRate })}
              />
              {(['notes', 'terms'] as const).map((key) => (
                <label key={key} className="ic-field ic-span">
                  {key === 'notes' ? 'Default notes' : 'Default terms'}
                  <textarea
                    maxLength={1500}
                    rows={2}
                    value={selected[key]}
                    onChange={(event) => setSelected({ ...selected, [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            {error && (
              <p className="ic-error ic-note" role="alert">
                {error}
              </p>
            )}
            <div className="ic-modal-actions">
              <button className="ic-button" type="button" onClick={() => edit(null)}>
                Cancel
              </button>
              <button className="ic-button ic-primary" type="submit">
                Save company
              </button>
            </div>
          </form>
        )}
      </WorkspaceDialog>
    </section>
  )
}

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
    <div className="ic-backup-layout ic-dialog-body">
      <section className="ic-backup-storage" aria-label="Local storage">
        <h2 className="ic-backup-section-title">Local storage</h2>
        <dl className="ic-stats">
          <div>
            <dt>Saved invoices</dt>
            <dd className="ic-mono">
              {workspace.invoices.length}
              <span className="ic-stat-cap"> / {maxInvoices}</span>
            </dd>
          </div>
          <div>
            <dt>Sender profiles</dt>
            <dd className="ic-mono">
              {workspace.companies.length}
              <span className="ic-stat-cap"> / {maxCompanies}</span>
            </dd>
          </div>
          <div>
            <dt>Products</dt>
            <dd className="ic-mono">
              {workspace.products.length}
              <span className="ic-stat-cap"> / {maxProducts}</span>
            </dd>
          </div>
          <div>
            <dt>Storage used</dt>
            <dd className="ic-mono">{formatBytes(storageBytes)}</dd>
          </div>
        </dl>
      </section>
      <div className="ic-backup-grid">
        <section className="ic-backup-card">
          <div className="ic-backup-card-head">
            <span className="ic-backup-badge" aria-hidden="true">
              <Icon name="download" />
            </span>
            <h2>Export a backup</h2>
          </div>
          <p className="ic-muted ic-backup-copy">
            Download a JSON copy of saved invoices, company profiles, products, and settings. Store
            it somewhere private.
          </p>
          <div className="ic-actions ic-backup-action">
            <button
              className="ic-button ic-primary"
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
                className="ic-button"
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
        <section className="ic-backup-card">
          <div className="ic-backup-card-head">
            <span className="ic-backup-badge" aria-hidden="true">
              <Icon name="upload" />
            </span>
            <h2>Restore a backup</h2>
          </div>
          <p className="ic-muted ic-backup-copy">
            Restore replaces the local workspace. Download a backup of what you have first.
          </p>
          <div className="ic-backup-action">
            <label className="ic-backup-dropzone">
              <Icon name="upload" />
              <span className="ic-backup-dropzone-text" aria-hidden="true">
                <strong>Choose backup file</strong>
                <span>.json up to 8 MB</span>
              </span>
              <input
                type="file"
                className="ic-backup-file-input"
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
            <p className="ic-error ic-note" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      <section className="ic-backup-danger" aria-label="Reset local data">
        <div>
          <h2>Reset local data</h2>
          <p className="ic-muted ic-backup-copy">
            Remove all saved invoices, sender profiles, and products from this browser. Export a
            JSON backup first.
          </p>
        </div>
        <button
          className="ic-button ic-danger"
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
