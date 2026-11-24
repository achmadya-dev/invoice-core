import { useEffect, useRef, useState } from 'react'
import {
  duplicateInvoice,
  invoiceLayoutLabels,
  invoiceLayouts,
  newInvoice,
  newWorkspace,
  resolveAccentColor,
  resolveInvoiceLayout,
  saveInvoice,
  saveProduct,
  type Invoice,
  type Workspace,
} from './domain/invoice'
import { InvoiceEditor } from './InvoiceEditor'
import { ProductsPanel } from './ProductsPanel'
import {
  ColorPicker,
  ConfirmModal,
  Icon,
  SelectField,
  WorkspaceDialog,
  type ConfirmState,
} from './invoice-ui'
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
  invoices: 'Invoices',
  catalog: 'Catalog',
} as const
type Panel = keyof typeof panels | 'editor'
type Message = { text: string; error?: boolean }

function panelFromHash(hash: string): Panel {
  if (hash === '#editor') return 'editor'
  if (['#catalog', '#products', '#companies', '#templates'].includes(hash)) return 'catalog'
  return 'invoices'
}

const panelCopy = {
  editor: {
    title: 'Invoice editor',
    detail: 'Edit directly on the invoice. Only saved invoices are kept.',
  },
  invoices: {
    title: 'Invoices',
    detail: 'Browse and manage saved invoice history.',
  },
  catalog: {
    title: 'Catalog',
    detail: 'Manage the products and company defaults you reuse on invoices.',
  },
}

export function InvoiceWorkspace() {
  const [local, setLocal] = useState<LocalWorkspace | null>(null)
  const current = useRef<LocalWorkspace | null>(null)
  const [storageWarning, setStorageWarning] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [panel, setPanel] = useState<Panel>('invoices')
  const [catalogTab, setCatalogTab] = useState<'products' | 'companies'>('products')
  const [backupOpen, setBackupOpen] = useState(false)
  const [backupConfirm, setBackupConfirm] = useState<ConfirmState | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [editor, setEditor] = useState<{ invoice: Invoice; edited: boolean } | null>(null)
  const draft = editor?.invoice

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
          'The workspace changed in another tab. Reload to see its latest saved data.',
        )
      }
    }
    const syncFromLocation = () => {
      const next = panelFromHash(window.location.hash)
      setPanel(next)
      if (next === 'catalog') {
        setCatalogTab(window.location.hash === '#companies' ? 'companies' : 'products')
      }
      setEditor(
        next === 'editor'
          ? {
              invoice: newInvoice(undefined, current.current?.data.invoices ?? []),
              edited: false,
            }
          : null,
      )
      setSaveAttempted(false)
      setBackupOpen(window.location.hash === '#backup')
      setBackupConfirm(null)
      setView('edit')
      setMessage(null)
    }
    syncFromLocation()
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

  function commit(data: Workspace, options: { restore?: boolean } = {}) {
    const before = current.current
    if (!before) return false
    const result = writeWorkspace(before, data, Boolean(options.restore))
    if (!result.ok) {
      setStorageWarning(result.message)
      return false
    }
    current.current = result.value
    setLocal(result.value)
    setStorageWarning('')
    return true
  }

  function editDraft(edit: (invoice: Invoice) => Invoice) {
    setMessage(null)
    setEditor((active) =>
      active && active.invoice.id === draft?.id
        ? { invoice: edit(active.invoice), edited: true }
        : active,
    )
  }

  function show(next: Panel) {
    setPanel(next)
    if (next !== 'editor') setEditor(null)
    setSaveAttempted(false)
    setView('edit')
    setMessage(null)
    setBackupOpen(false)
    setBackupConfirm(null)
    const nextHash = next === 'invoices' ? '' : `#${next}`
    if (window.location.hash !== nextHash) {
      window.history.pushState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${nextHash}`,
      )
    }
  }

  function openEditor(invoice: Invoice, edited = false) {
    setSaveAttempted(false)
    setEditor({ invoice, edited })
    show('editor')
  }

  function saveEditor() {
    const data = current.current?.data
    if (!data || !draft) return
    const result = saveInvoice(data, draft)
    if (!result.ok) {
      setSaveAttempted(true)
      setMessage({ text: result.message, error: true })
    } else if (commit(result.data)) {
      setSaveAttempted(false)
      show('invoices')
      setMessage({ text: 'Invoice saved.' })
    }
  }

  function duplicateSavedInvoice(invoice: Invoice) {
    const data = current.current?.data
    if (!data) return
    openEditor(
      duplicateInvoice(
        invoice,
        data.companies.find((company) => company.id === invoice.companyId),
        data.invoices,
      ),
      true,
    )
  }

  function deleteInvoice(invoice: Invoice) {
    setConfirmModal({
      title: `Delete invoice ${invoice.number}?`,
      description:
        'This removes the saved invoice from history and cannot be undone without a backup.',
      confirmLabel: 'Delete invoice',
      danger: true,
      onConfirm: () => {
        const data = current.current?.data
        if (!data) return
        const remaining = data.invoices.filter((entry) => entry.id !== invoice.id)
        if (commit({ ...data, invoices: remaining })) {
          show('invoices')
          setMessage({ text: 'Invoice deleted.' })
        }
      },
    })
  }

  function clearWorkspace() {
    const fresh = newWorkspace()
    const ok = commit(
      { ...fresh, theme: current.current?.data.theme ?? 'system' },
      { restore: true },
    )
    if (ok) {
      show('invoices')
      setMessage({ text: 'Local workspace cleared.' })
    }
    return ok
  }

  async function downloadPdf(target: Invoice) {
    if (pdfBusyId !== null) return
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
        text: 'The PDF could not be generated. Try again or use your browser print dialog.',
        error: true,
      })
    } finally {
      setPdfBusyId(null)
    }
  }

  const data = local?.data
  const theme = data?.theme ?? 'system'
  const copy = panelCopy[panel]
  const isSavedDraft =
    data && draft ? data.invoices.some((invoice) => invoice.id === draft.id) : false
  return (
    <div className="ic-workspace" data-theme={theme}>
      <header className="ic-topbar">
        <div className="ic-shell ic-topbar-inner">
          <button type="button" className="ic-brand" onClick={() => show('invoices')}>
            <span className="ic-brand-mark">
              <Icon name="mark" />
            </span>{' '}
            Invoice Core
          </button>
          <nav className="ic-nav" aria-label="Workspace">
            {(Object.keys(panels) as (keyof typeof panels)[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={!data}
                aria-current={
                  key === (panel === 'editor' ? 'invoices' : panel) ? 'page' : undefined
                }
                onClick={() => show(key)}
              >
                {panels[key]}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="ic-shell">
        <div className="ic-heading" data-panel={panel}>
          <div>
            {data && panel === 'editor' && (
              <button
                type="button"
                className="ic-text-button ic-back"
                onClick={() => show('invoices')}
              >
                <Icon name="back" /> Back to invoices
              </button>
            )}
            <h1>{copy.title}</h1>
            <p>{copy.detail}</p>
          </div>
          {data && panel === 'editor' && draft && (
            <div className="ic-actions ic-heading-actions ic-editor-appearance">
              <ColorPicker
                label="Accent color"
                value={resolveAccentColor(draft)}
                onChange={(accentColor) => editDraft((current) => ({ ...current, accentColor }))}
              />
              <SelectField
                label="Layout"
                value={resolveInvoiceLayout(draft)}
                options={invoiceLayouts.map((value) => ({
                  value,
                  label: invoiceLayoutLabels[value],
                }))}
                onChange={(value) => {
                  const match = invoiceLayouts.find((entry) => entry === value)
                  if (match) editDraft((current) => ({ ...current, layout: match }))
                }}
              />
            </div>
          )}
          {data && panel === 'invoices' && (
            <div className="ic-actions ic-heading-actions">
              <button type="button" className="ic-button" onClick={() => setBackupOpen(true)}>
                Backup
              </button>
              <button
                type="button"
                className="ic-button ic-primary"
                onClick={() => openEditor(newInvoice(undefined, data.invoices))}
              >
                <Icon name="plus" /> Create invoice
              </button>
            </div>
          )}
        </div>
        {storageWarning && (
          <p className="ic-banner ic-error" role="alert">
            {storageWarning}
          </p>
        )}
        {message && panel !== 'editor' && (
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
        {data && panel === 'editor' && draft && (
          <InvoiceEditor
            key={draft.id}
            draft={draft}
            workspace={data}
            edit={editDraft}
            view={view}
            setView={setView}
            onSave={saveEditor}
            notice={message ?? undefined}
            showErrors={saveAttempted}
            onDownload={() => void downloadPdf(draft)}
            pdfBusy={pdfBusyId !== null}
            onResetDraft={
              editor?.edited && !isSavedDraft
                ? () => openEditor(newInvoice(undefined, data.invoices))
                : undefined
            }
            onDuplicate={isSavedDraft ? () => duplicateSavedInvoice(draft) : undefined}
            onDelete={isSavedDraft ? () => deleteInvoice(draft) : undefined}
          />
        )}
        {data && panel === 'invoices' && (
          <InvoiceHistory
            workspace={data}
            pdfBusyId={pdfBusyId}
            open={openEditor}
            downloadPdf={(invoice) => void downloadPdf(invoice)}
            duplicate={duplicateSavedInvoice}
            remove={(invoice) => deleteInvoice(invoice)}
          />
        )}
        {data && panel === 'catalog' && (
          <div className="ic-catalog">
            <div className="ic-catalog-tabs" role="tablist" aria-label="Catalog sections">
              <button
                type="button"
                role="tab"
                id="tab-products"
                aria-selected={catalogTab === 'products'}
                aria-controls="panel-products"
                onClick={() => setCatalogTab('products')}
              >
                Products
              </button>
              <button
                type="button"
                role="tab"
                id="tab-companies"
                aria-selected={catalogTab === 'companies'}
                aria-controls="panel-companies"
                onClick={() => setCatalogTab('companies')}
              >
                Companies
              </button>
            </div>
            {catalogTab === 'products' ? (
              <div id="panel-products" role="tabpanel" aria-labelledby="tab-products">
                <ProductsPanel
                  products={data.products}
                  theme={theme}
                  save={(product) => {
                    const latest = current.current?.data
                    if (!latest) return { ok: false }
                    const result = saveProduct(latest, product)
                    if (!result.ok) return result
                    if (!commit(result.data)) return { ok: false }
                    setMessage({ text: 'Product saved.' })
                    return { ok: true }
                  }}
                  remove={(product) => {
                    setConfirmModal({
                      title: `Delete ${product.name}?`,
                      description:
                        'Existing invoice drafts and saved invoices keep their line items.',
                      confirmLabel: 'Delete product',
                      danger: true,
                      onConfirm: () => {
                        const latest = current.current?.data
                        if (!latest) return
                        if (
                          commit({
                            ...latest,
                            products: latest.products.filter(({ id }) => id !== product.id),
                          })
                        ) {
                          setMessage({ text: 'Product removed.' })
                        }
                      },
                    })
                  }}
                />
              </div>
            ) : (
              <div id="panel-companies" role="tabpanel" aria-labelledby="tab-companies">
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
                    setConfirmModal({
                      title: `Delete ${company.sender.name}?`,
                      description: 'Saved invoices keep their existing sender details.',
                      confirmLabel: 'Delete company',
                      danger: true,
                      onConfirm: () => {
                        const latest = current.current?.data
                        if (!latest) return
                        const ok = commit({
                          ...latest,
                          companies: latest.companies.filter((entry) => entry.id !== company.id),
                        })
                        if (ok) {
                          setMessage({ text: 'Sender profile removed.' })
                        }
                      },
                    })
                  }}
                />
              </div>
            )}
          </div>
        )}
        {data && panel === 'invoices' && (
          <WorkspaceDialog
            open={backupOpen}
            title="Backup"
            description="Export, restore, or clear the workspace on this device."
            theme={theme}
            onClose={() => {
              setBackupOpen(false)
              setBackupConfirm(null)
            }}
          >
            {backupOpen && (
              <Backup
                workspace={data}
                storageBytes={new Blob([local?.raw ?? JSON.stringify(data)]).size}
                damaged={local.damaged ? local.raw : null}
                restore={(restored) => {
                  const ok = commit(restored, { restore: true })
                  if (ok) {
                    show('invoices')
                    setMessage({ text: 'Backup restored.' })
                  }
                  return ok
                }}
                clear={clearWorkspace}
                requestConfirm={setBackupConfirm}
              />
            )}
            <ConfirmModal
              confirm={backupConfirm}
              theme={theme}
              onClose={() => setBackupConfirm(null)}
            />
          </WorkspaceDialog>
        )}
        <footer className="ic-footer">
          <span>Invoice data stays in this browser. Keep a backup.</span>
          {offlineReady && <span role="status">Available offline</span>}
        </footer>
      </main>
      <ConfirmModal confirm={confirmModal} theme={theme} onClose={() => setConfirmModal(null)} />
    </div>
  )
}
