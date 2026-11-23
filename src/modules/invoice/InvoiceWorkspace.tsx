import { useEffect, useRef, useState } from 'react'
import {
  duplicateInvoice,
  invoiceError,
  newCompany,
  newInvoice,
  newItem,
  saveDraft,
  themes,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import { InvoiceEditor } from './InvoiceEditor'
import { Icon } from './invoice-ui'
import { Backup, Companies, InvoiceHistory } from './WorkspacePanels'
import {
  downloadFile,
  loadWorkspace,
  storageKey,
  writeWorkspace,
  type LocalWorkspace,
} from './workspace.browser'
import { prepareOffline } from './offline.browser'
import { loadPdfRenderer } from './pdf.browser'

const panels = {
  editor: 'Editor',
  history: 'History',
  companies: 'Companies',
  backup: 'Backup',
} as const
type Panel = keyof typeof panels
type Message = { text: string; error?: boolean }

const panelCopy = {
  editor: {
    title: 'Invoice editor',
    detail: 'Build your invoice and check the document as you type.',
  },
  history: {
    title: 'Invoice history',
    detail: 'Find, reopen, or duplicate an invoice saved on this device.',
  },
  companies: {
    title: 'Companies',
    detail: 'Manage sender profiles, numbering, and reusable invoice defaults.',
  },
  backup: {
    title: 'Backup',
    detail: 'Take a copy of your workspace or restore it from a previous backup.',
  },
}

export function InvoiceWorkspace() {
  const [local, setLocal] = useState<LocalWorkspace | null>(null)
  const current = useRef<LocalWorkspace | null>(null)
  const [storageWarning, setStorageWarning] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [panel, setPanel] = useState<Panel>('editor')
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const draft = local?.data.draft

  useEffect(() => {
    const initial = loadWorkspace()
    current.current = initial
    setLocal(initial)
    setStorageWarning(initial.warning)
    const crossTab = (event: StorageEvent) => {
      if (
        (event.key === storageKey || event.key === null) &&
        event.newValue !== current.current?.raw
      ) {
        setStorageWarning(
          'The workspace changed in another tab. Export this tab’s draft before reloading.',
        )
      }
    }
    window.addEventListener('storage', crossTab)
    return () => window.removeEventListener('storage', crossTab)
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD) return
    let active = true
    void prepareOffline().then((ready) => {
      if (active) setOfflineReady(ready)
    })
    return () => {
      active = false
    }
  }, [])

  function commit(data: Workspace, options: { keepDraft?: boolean; restore?: boolean } = {}) {
    const before = current.current
    if (!before) return false
    const result = writeWorkspace(before, data, Boolean(options.restore))
    if (!result.ok) {
      if (options.keepDraft) {
        const pending = { ...before, data }
        current.current = pending
        setLocal(pending)
      }
      setStorageWarning(result.message)
      return false
    }
    current.current = result.value
    setLocal(result.value)
    setStorageWarning('')
    return true
  }

  function editDraft(edit: (invoice: Invoice) => Invoice) {
    const data = current.current?.data
    if (!data || data.draft.id !== draft?.id) return
    setMessage(null)
    commit({ ...data, dirty: true, draft: edit(data.draft) }, { keepDraft: true })
  }

  function show(next: Panel) {
    setPanel(next)
    setView('edit')
    setMessage(null)
  }

  function replaceDraft(data: Workspace, next: Invoice, dirty = false) {
    if (
      data.dirty &&
      !window.confirm(
        'Replace the active draft? Changes not saved to invoice history will be lost.',
      )
    )
      return
    if (commit({ ...data, draft: next, dirty })) show('editor')
  }

  function startDraft(data: Workspace) {
    const company = data.companies[0] ?? newCompany('Personal')
    const companies = data.companies.length ? data.companies : [company]
    replaceDraft({ ...data, companies }, newInvoice(company, data.invoices))
  }

  function saveEditor() {
    const data = current.current?.data
    if (!data) return
    const result = saveDraft(data)
    if (!result.ok) setMessage({ text: result.message, error: true })
    else if (commit(result.data)) setMessage({ text: 'Invoice saved to history.' })
  }

  async function downloadPdf() {
    if (!draft || pdfBusy) return
    const error = invoiceError(draft)
    if (error) {
      setMessage({ text: error, error: true })
      return
    }
    setPdfBusy(true)
    setMessage(null)
    try {
      const { createInvoicePdf } = await loadPdfRenderer()
      const blob = await createInvoicePdf(draft)
      const name = draft.number
        .trim()
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .slice(0, 100)
      downloadFile(blob, `${name || 'invoice'}.pdf`)
      setMessage({ text: 'PDF downloaded.' })
    } catch {
      setMessage({
        text: 'The PDF could not be generated. Use Print / Save as PDF instead.',
        error: true,
      })
    } finally {
      setPdfBusy(false)
    }
  }

  const data = local?.data
  const copy = panelCopy[panel]
  return (
    <div className="ic-workspace" data-theme={data?.theme ?? 'system'}>
      <header className="ic-topbar">
        <div className="ic-shell ic-topbar-inner">
          <button type="button" className="ic-brand" onClick={() => show('editor')}>
            <span className="ic-brand-mark">
              <Icon name="mark" />
            </span>{' '}
            Invoice Core
          </button>
          <nav className="ic-nav" aria-label="Workspace">
            {(Object.keys(panels) as Panel[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={!data}
                aria-current={key === panel ? 'page' : undefined}
                onClick={() => show(key)}
              >
                {panels[key]}
              </button>
            ))}
          </nav>
          <div className="ic-topbar-options">
            <label className="sr-only" htmlFor="invoice-theme">
              Theme
            </label>
            <select
              id="invoice-theme"
              value={data?.theme ?? 'system'}
              disabled={!data}
              onChange={(event) => {
                const theme = themes.find((value) => value === event.target.value)
                if (data && theme) commit({ ...data, theme }, { keepDraft: true })
              }}
            >
              <option value="system">System theme</option>
              <option value="light">Light theme</option>
              <option value="dark">Dark theme</option>
            </select>
          </div>
        </div>
      </header>
      <main className="ic-shell">
        <div className="ic-heading">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.detail}</p>
          </div>
          {data && panel === 'editor' && (
            <div className="ic-actions ic-heading-actions">
              <button type="button" className="ic-button" onClick={saveEditor}>
                Save invoice
              </button>
              <button
                type="button"
                className="ic-button ic-primary"
                disabled={pdfBusy}
                onClick={() => void downloadPdf()}
              >
                <Icon name="download" /> {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
              </button>
            </div>
          )}
          {data && panel === 'history' && (
            <button type="button" className="ic-button ic-primary" onClick={() => startDraft(data)}>
              <Icon name="plus" /> New invoice
            </button>
          )}
        </div>
        {storageWarning && (
          <p className="ic-banner ic-error" role="alert">
            {storageWarning}
          </p>
        )}
        {message && (
          <p
            className={`ic-banner${message.error ? 'ic-error' : ''}`}
            role={message.error ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}
        {!data && (
          <p className="ic-banner" role="status">
            Opening the local workspace…
          </p>
        )}
        {data && panel === 'editor' && (
          <>
            <div className="ic-editor-tools">
              <div className="ic-actions">
                <button type="button" className="ic-text-button" onClick={() => startDraft(data)}>
                  <Icon name="plus" /> New invoice
                </button>
                {!data.dirty && !data.invoices.some((invoice) => invoice.id === data.draft.id) && (
                  <button
                    className="ic-text-button"
                    type="button"
                    onClick={() => {
                      editDraft((invoice) => ({
                        ...invoice,
                        sender: {
                          ...invoice.sender,
                          name: 'Northline Studio',
                          address: '',
                          logo: '',
                          paymentDetails: '',
                          country: '',
                          website: '',
                          taxId: '',
                          email: '',
                          phone: '',
                        },
                        client: { ...invoice.client, name: 'Fieldwork Press' },
                        items: [
                          { ...newItem('Editorial design'), rate: '900' },
                          { ...newItem('Illustration set'), quantity: '2', rate: '275' },
                          { ...newItem('Production files'), rate: '150' },
                        ],
                      }))
                      setMessage({
                        text: 'Example loaded. Replace the sample details before sending an invoice.',
                      })
                    }}
                  >
                    Load example
                  </button>
                )}
              </div>
              <div className="ic-actions">
                <button
                  type="button"
                  className="ic-text-button"
                  onClick={() => {
                    const error = invoiceError(data.draft)
                    if (error) setMessage({ text: error, error: true })
                    else window.print()
                  }}
                >
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  className="ic-text-button ic-desktop-preview"
                  onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}
                >
                  {view === 'edit' ? 'Focus preview' : 'Back to editor'} <Icon name="arrow" />
                </button>
              </div>
            </div>
            <InvoiceEditor
              key={data.draft.id}
              workspace={data}
              edit={editDraft}
              view={view}
              setView={setView}
            />
          </>
        )}
        {data && panel === 'history' && (
          <InvoiceHistory
            workspace={data}
            newDraft={() => show('editor')}
            open={(invoice) => {
              if (invoice.id === data.draft.id && !data.dirty) show('editor')
              else replaceDraft(data, invoice)
            }}
            duplicate={(invoice) =>
              replaceDraft(
                data,
                duplicateInvoice(
                  invoice,
                  data.companies.find((company) => company.id === invoice.companyId),
                  data.invoices,
                ),
                true,
              )
            }
            remove={(invoice) => {
              if (
                !window.confirm(
                  `Delete saved invoice ${invoice.number}? This cannot be undone without a backup.`,
                )
              )
                return
              if (
                commit({
                  ...data,
                  invoices: data.invoices.filter((entry) => entry.id !== invoice.id),
                })
              ) {
                setMessage({ text: 'Invoice removed from history.' })
              }
            }}
          />
        )}
        {data && panel === 'companies' && (
          <Companies
            companies={data.companies}
            save={(company) => {
              const exists = data.companies.some((entry) => entry.id === company.id)
              const companies = exists
                ? data.companies.map((entry) => (entry.id === company.id ? company : entry))
                : [...data.companies, company]
              const ok = commit({ ...data, companies })
              if (ok) setMessage({ text: 'Sender profile saved.' })
              return ok
            }}
            remove={(company) => {
              if (
                !window.confirm(
                  `Delete ${company.sender.name}? Saved invoices keep their existing sender details.`,
                )
              )
                return false
              const ok = commit({
                ...data,
                companies: data.companies.filter((entry) => entry.id !== company.id),
              })
              if (ok) setMessage({ text: 'Sender profile removed.' })
              return ok
            }}
          />
        )}
        {data && panel === 'backup' && (
          <Backup
            workspace={data}
            damaged={local.damaged ? local.raw : null}
            restore={(restored) => {
              const ok = commit(restored, { restore: true })
              if (ok)
                setMessage({
                  text: 'Backup restored. Open the editor or history to see the restored records.',
                })
              return ok
            }}
          />
        )}
        <footer className="ic-footer">
          <span>Invoice data stays in this browser. Keep a backup.</span>
          {offlineReady && <span role="status">Available offline</span>}
        </footer>
      </main>
    </div>
  )
}
