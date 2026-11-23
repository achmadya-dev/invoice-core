import { useEffect, useRef, useState } from 'react'
import {
  duplicateInvoice,
  invoiceError,
  newCompany,
  newInvoice,
  newItem,
  newWorkspace,
  saveDraft,
  updateInvoiceStatus,
  type Invoice,
  type InvoiceStatus,
  type Workspace,
} from './domain/invoice'
import { InvoiceEditor } from './InvoiceEditor'
import { Icon, ThemeSelect } from './invoice-ui'
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

function panelFromHash(hash: string): Panel {
  const value = hash.replace(/^#/, '')
  return value === 'history' || value === 'companies' || value === 'backup' ? value : 'editor'
}

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
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const draft = local?.data.draft

  useEffect(() => {
    const initial = loadWorkspace()
    current.current = initial
    setLocal(initial)
    setStorageWarning(initial.warning)
    setPanel(panelFromHash(window.location.hash))
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
    const syncFromLocation = () => {
      setPanel(panelFromHash(window.location.hash))
      setView('edit')
      setMessage(null)
    }
    window.addEventListener('storage', crossTab)
    window.addEventListener('hashchange', syncFromLocation)
    window.addEventListener('popstate', syncFromLocation)
    return () => {
      window.removeEventListener('storage', crossTab)
      window.removeEventListener('hashchange', syncFromLocation)
      window.removeEventListener('popstate', syncFromLocation)
    }
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
    const nextHash = next === 'editor' ? '' : `#${next}`
    if (window.location.hash !== nextHash) {
      window.history.pushState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${nextHash}`,
      )
    }
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

  function loadExample() {
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
  }

  function printInvoice() {
    const data = current.current?.data
    if (!data) return
    const error = invoiceError(data.draft)
    if (error) setMessage({ text: error, error: true })
    else window.print()
  }

  function duplicateSavedInvoice(invoice: Invoice) {
    const data = current.current?.data
    if (!data) return
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

  function deleteInvoice(invoice: Invoice, replaceActiveDraft = false) {
    const data = current.current?.data
    if (!data) return
    if (
      !window.confirm(
        `Delete saved invoice ${invoice.number}? This cannot be undone without a backup.`,
      )
    )
      return
    const remaining = data.invoices.filter((entry) => entry.id !== invoice.id)
    if (replaceActiveDraft) {
      const company =
        data.companies.find((entry) => entry.id === invoice.companyId) ??
        data.companies[0] ??
        newCompany('Personal')
      const companies = data.companies.length ? data.companies : [company]
      if (
        commit({
          ...data,
          companies,
          invoices: remaining,
          draft: newInvoice(company, remaining),
          dirty: false,
        })
      ) {
        setView('edit')
        setMessage({ text: 'Invoice removed from history.' })
      }
      return
    }
    if (commit({ ...data, invoices: remaining })) {
      setMessage({ text: 'Invoice removed from history.' })
    }
  }

  function clearWorkspace() {
    const fresh = newWorkspace()
    const ok = commit(
      { ...fresh, theme: current.current?.data.theme ?? 'system' },
      { restore: true },
    )
    if (ok) setMessage({ text: 'Local workspace cleared.' })
    return ok
  }

  async function downloadPdf(target: Invoice) {
    if (pdfBusyId !== null) return
    const error = invoiceError(target)
    if (error) {
      setMessage({ text: error, error: true })
      return
    }
    setPdfBusyId(target.id)
    setMessage(null)
    try {
      const { createInvoicePdf } = await loadPdfRenderer()
      const blob = await createInvoicePdf(target)
      const name = target.number
        .trim()
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .slice(0, 100)
      downloadFile(blob, `${name || 'invoice'}.pdf`)
      setMessage({ text: 'PDF downloaded.' })
    } catch {
      setMessage({
        text: 'The PDF could not be generated. Use Print instead.',
        error: true,
      })
    } finally {
      setPdfBusyId(null)
    }
  }

  const data = local?.data
  const theme = data?.theme ?? 'system'
  const copy = panelCopy[panel]
  return (
    <div className="ic-workspace" data-theme={theme}>
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
          <ThemeSelect
            value={theme}
            disabled={!data}
            onChange={(nextTheme) => {
              if (data) commit({ ...data, theme: nextTheme }, { keepDraft: true })
            }}
          />
        </div>
      </header>
      <main className="ic-shell">
        <div className="ic-heading">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.detail}</p>
          </div>
          {data && panel === 'editor' && draft && (
            <div className="ic-actions ic-heading-actions">
              <button type="button" className="ic-text-button" onClick={() => startDraft(data)}>
                <Icon name="plus" /> New invoice
              </button>
              <button type="button" className="ic-button" onClick={saveEditor}>
                Save invoice
              </button>
              <button
                type="button"
                className="ic-button ic-primary"
                disabled={pdfBusyId !== null}
                onClick={() => void downloadPdf(draft)}
              >
                <Icon name="download" />{' '}
                {pdfBusyId === draft.id ? 'Preparing PDF…' : 'Download PDF'}
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
            className={message.error ? 'ic-banner ic-error' : 'ic-banner'}
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
          <InvoiceEditor
            key={data.draft.id}
            workspace={data}
            edit={editDraft}
            view={view}
            setView={setView}
            onLoadExample={
              !data.dirty && !data.invoices.some((invoice) => invoice.id === data.draft.id)
                ? loadExample
                : undefined
            }
            onPrint={printInvoice}
            onDuplicate={
              data.invoices.some((invoice) => invoice.id === data.draft.id)
                ? () => duplicateSavedInvoice(data.draft)
                : undefined
            }
            onDelete={
              data.invoices.some((invoice) => invoice.id === data.draft.id)
                ? () => deleteInvoice(data.draft, true)
                : undefined
            }
          />
        )}
        {data && panel === 'history' && (
          <InvoiceHistory
            workspace={data}
            pdfBusyId={pdfBusyId}
            newDraft={() => show('editor')}
            open={(invoice) => {
              if (invoice.id === data.draft.id && !data.dirty) show('editor')
              else replaceDraft(data, invoice)
            }}
            downloadPdf={(invoice) => void downloadPdf(invoice)}
            updateStatus={(invoice, status: InvoiceStatus) => {
              if (commit(updateInvoiceStatus(data, invoice.id, status))) {
                setMessage({ text: `Marked ${invoice.number} as ${status}.` })
              }
            }}
            duplicate={duplicateSavedInvoice}
            remove={(invoice) => deleteInvoice(invoice)}
          />
        )}
        {data && panel === 'companies' && (
          <Companies
            companies={data.companies}
            theme={data.theme}
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
            storageBytes={new Blob([local?.raw ?? JSON.stringify(data)]).size}
            damaged={local.damaged ? local.raw : null}
            restore={(restored) => {
              const ok = commit(restored, { restore: true })
              if (ok)
                setMessage({
                  text: 'Backup restored. Open the editor or history to see the restored records.',
                })
              return ok
            }}
            clear={clearWorkspace}
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
