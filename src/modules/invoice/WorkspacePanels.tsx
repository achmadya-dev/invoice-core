import { useRef, useState, type FormEvent } from 'react'
import {
  companyError,
  formatDate,
  formatMoney,
  invoiceTotals,
  maxBackupBytes,
  maxCompanies,
  newCompany,
  type Company,
  type Invoice,
  type Theme,
  type Workspace,
} from './domain/invoice'
import { CurrencySelect, Icon, SelectField, SenderFields } from './invoice-ui'
import { DecimalField } from './InvoiceEditor'
import { decodeWorkspace, downloadFile } from './workspace.browser'

export function InvoiceHistory({
  workspace,
  open,
  duplicate,
  remove,
  newDraft,
}: {
  workspace: Workspace
  open: (invoice: Invoice) => void
  duplicate: (invoice: Invoice) => void
  remove: (invoice: Invoice) => void
  newDraft: () => void
}) {
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState('')
  const choices = new Map(workspace.companies.map((company) => [company.id, company.sender.name]))
  for (const invoice of workspace.invoices)
    if (!choices.has(invoice.companyId)) choices.set(invoice.companyId, invoice.sender.name)
  const search = query.trim().toLowerCase()
  const filtered = workspace.invoices.filter(
    (invoice) =>
      (!profile || invoice.companyId === profile) &&
      [invoice.number, invoice.client.name, invoice.sender.name, invoice.status].some((value) =>
        value.toLowerCase().includes(search),
      ),
  )
  return (
    <section className="ic-editor ic-panel">
      <div className="ic-filter">
        <label className="ic-field">
          Search invoices
          <input
            type="search"
            value={query}
            placeholder="Number, client, or status"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <SelectField
          label="Filter by company"
          value={profile}
          placeholder="All companies"
          options={Array.from(choices, ([id, name]) => ({ value: id, label: name }))}
          onChange={setProfile}
        />
      </div>
      {workspace.invoices.length === 0 ? (
        <div className="ic-empty">
          <h2>No saved invoices yet</h2>
          <p>Save your first invoice to keep it in your local history.</p>
          <button className="ic-button" type="button" onClick={newDraft}>
            Go to editor
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="ic-empty">No invoices match these filters.</p>
      ) : (
        <ul className="ic-records">
          {filtered.map((invoice) => {
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
                  <span className={`ic-tag ic-${invoice.status}`}>{invoice.status}</span>
                </div>
                <div className="ic-actions">
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
  remove: (company: Company) => boolean
  theme: Theme
}) {
  const [selected, setSelected] = useState<Company | null>(null)
  const [error, setError] = useState('')
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
  }
  return (
    <div className="ic-company-layout">
      <section className="ic-editor ic-panel" aria-label="Companies">
        <div className="ic-panel-bar">
          <h2>Sender profiles</h2>
        </div>
        <ul className="ic-profile-list">
          {companies.map((company) => (
            <li key={company.id}>
              <button
                type="button"
                className="ic-profile"
                aria-pressed={selected?.id === company.id}
                onClick={() => edit(company)}
              >
                <span>{company.sender.name}</span>
                <span className="ic-mono">{company.currency}</span>
              </button>
            </li>
          ))}
        </ul>
        {companies.length === 0 && (
          <p className="ic-empty">Add a company to reuse its sender details.</p>
        )}
        <div className="ic-panel-pad">
          <button
            type="button"
            className="ic-button"
            disabled={companies.length >= maxCompanies}
            onClick={() => edit(newCompany())}
          >
            <Icon name="plus" /> Add company
          </button>
        </div>
      </section>
      {selected ? (
        <section className="ic-editor ic-panel" aria-label="Company details">
          <div className="ic-panel-bar">
            <h2>
              {companies.some((company) => company.id === selected.id)
                ? 'Edit company'
                : 'New company'}
            </h2>
          </div>
          <form className="ic-panel-pad" onSubmit={submit}>
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
            <div className="ic-actions ic-note">
              <button className="ic-button ic-primary" type="submit">
                Save company
              </button>
              <button className="ic-button" type="button" onClick={() => edit(null)}>
                Cancel
              </button>
              {companies.some((company) => company.id === selected.id) && (
                <button
                  className="ic-text-button"
                  type="button"
                  onClick={() => {
                    if (remove(selected)) edit(null)
                  }}
                >
                  Delete company
                </button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section className="ic-editor ic-empty">
          <h2>Choose a sender profile</h2>
          <p>
            Set a numbering series, logo, and invoice defaults. Saved invoices keep their original
            sender details.
          </p>
        </section>
      )}
    </div>
  )
}

export function Backup({
  workspace,
  damaged,
  restore,
}: {
  workspace: Workspace
  damaged: string | null
  restore: (data: Workspace) => boolean
}) {
  const [candidate, setCandidate] = useState<Workspace | null>(null)
  const [error, setError] = useState('')
  const importAttempt = useRef(0)
  return (
    <div className="ic-company-layout">
      <section className="ic-editor ic-panel ic-panel-pad">
        <h2>Export a backup</h2>
        <p className="ic-muted ic-note">
          Download a JSON copy of this draft, history, company profiles, and settings. Store it
          somewhere private.
        </p>
        <div className="ic-actions ic-note">
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
      <section className="ic-editor ic-panel ic-panel-pad">
        <h2>Restore a backup</h2>
        <p className="ic-muted ic-note">
          Restore replaces the local workspace. Download a backup of what you have first.
        </p>
        <label className="ic-field ic-note">
          Invoice Core backup file
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              const attempt = ++importAttempt.current
              setCandidate(null)
              setError('')
              if (!file) return
              try {
                const data = file.size <= maxBackupBytes ? decodeWorkspace(await file.text()) : null
                if (attempt !== importAttempt.current) return
                if (data) setCandidate(data)
                else
                  setError(
                    'This is not a valid Invoice Core backup (maximum 8 MB). Nothing was replaced.',
                  )
              } catch {
                if (attempt === importAttempt.current)
                  setError('The file could not be read. Nothing was replaced.')
              }
            }}
          />
        </label>
        {error && (
          <p className="ic-error ic-note" role="alert">
            {error}
          </p>
        )}
        {candidate && (
          <div className="ic-confirm ic-note">
            <p>
              {candidate.invoices.length} saved invoice(s), {candidate.companies.length} sender
              profile(s), and one active draft. Replace this workspace with the selected backup?
            </p>
            <div className="ic-actions ic-note">
              <button
                className="ic-button ic-primary"
                type="button"
                onClick={() => {
                  if (restore(candidate)) setCandidate(null)
                }}
              >
                Replace local workspace
              </button>
              <button className="ic-button" type="button" onClick={() => setCandidate(null)}>
                Cancel restore
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
