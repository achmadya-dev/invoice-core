import { useState, type FormEvent } from 'react'
import { maxCompanies, newCompany, type Company } from './domain/invoice'
import {
  actionsClass,
  buttonClass,
  CurrencySelect,
  DecimalField,
  fieldClass,
  fieldsGridClass,
  Icon,
  panelClass,
  primaryButtonClass,
  recordRowBaseClass,
  recordTriggerClass,
  SenderFields,
  shouldOpenRecordRow,
  textButtonClass,
  WorkspaceDialog,
} from './invoice-ui'

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
