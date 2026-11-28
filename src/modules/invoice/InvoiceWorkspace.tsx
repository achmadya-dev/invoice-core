import { Tabs } from '@base-ui/react/tabs'
import { useEffect, useRef, useState } from 'react'
import {
  defaultAccentColor,
  duplicateInvoice,
  invoiceLayoutLabels,
  invoiceLayouts,
  newInvoice,
  newWorkspace,
  resolveAccentColor,
  resolveInvoiceLayout,
  sanitizeFilename,
  saveCompany,
  saveInvoice,
  saveProduct,
  type Invoice,
  type Theme,
  type Workspace,
} from './domain/invoice'
import { InvoiceEditor } from './InvoiceEditor'
import { ProductsPanel } from './ProductsPanel'
import {
  actionsClass,
  bannerClass,
  buttonClass,
  ColorPicker,
  ConfirmModal,
  errorBannerClass,
  Icon,
  primaryButtonClass,
  SelectField,
  shellClass,
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

const tabs = {
  invoices: 'Invoices',
  products: 'Products',
  companies: 'Companies',
} as const
type Tab = keyof typeof tabs
type Message = { text: string; error?: boolean }

function tabFromHash(hash: string): Tab {
  if (hash === '#companies') return 'companies'
  if (['#products', '#catalog', '#templates'].includes(hash)) return 'products'
  return 'invoices'
}

const tabCopy = {
  invoices: {
    title: 'Invoices',
    detail: 'Browse and manage saved invoice history.',
  },
  products: {
    title: 'Products',
    detail: 'Manage reusable products and services for your invoices.',
  },
  companies: {
    title: 'Companies',
    detail: 'Manage sender profiles, numbering, and defaults for new invoices.',
  },
}

export function InvoiceWorkspace() {
  const [local, setLocal] = useState<LocalWorkspace | null>(null)
  const current = useRef<LocalWorkspace | null>(null)
  const [storageWarning, setStorageWarning] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [tab, setTab] = useState<Tab>('invoices')
  const [backupOpen, setBackupOpen] = useState(false)
  const [backupConfirm, setBackupConfirm] = useState<ConfirmState | null>(null)
  const [editorConfirm, setEditorConfirm] = useState<ConfirmState | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [editor, setEditor] = useState<{ invoice: Invoice; edited: boolean } | null>(null)
  const [systemDark, setSystemDark] = useState(false)
  const [damagedTheme, setDamagedTheme] = useState<Theme | null>(null)
  const draft = editor?.invoice

  useEffect(() => {
    const initial = loadWorkspace()
    current.current = initial
    setLocal(initial)
    setStorageWarning(initial.warning)
    const darkMedia = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (darkMedia) {
      setSystemDark(darkMedia.matches)
    }
    const onMediaChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    darkMedia?.addEventListener('change', onMediaChange)
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
      setTab(tabFromHash(window.location.hash))
      setEditor(
        window.location.hash === '#editor'
          ? {
              invoice: newInvoice(undefined, current.current?.data.invoices ?? []),
              edited: false,
            }
          : null,
      )
      setSaveAttempted(false)
      setBackupOpen(window.location.hash === '#backup')
      setBackupConfirm(null)
      setEditorConfirm(null)
      setView('edit')
      setMessage(null)
    }
    syncFromLocation()
    window.addEventListener('storage', crossTab)
    window.addEventListener('hashchange', syncFromLocation)
    window.addEventListener('popstate', syncFromLocation)
    return () => {
      darkMedia?.removeEventListener('change', onMediaChange)
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

  const theme: Theme = local?.damaged
    ? (damagedTheme ?? local.data.theme)
    : (local?.data.theme ?? 'system')
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    return () => {
      document.documentElement.dataset.theme = 'system'
    }
  }, [theme])

  function commit(
    data: Workspace,
    options: { restore?: boolean } = {},
  ): { ok: true } | { ok: false; message: string } {
    const before = current.current
    if (!before) {
      return { ok: false, message: 'The workspace is still loading. Try again.' }
    }
    const result = writeWorkspace(before, data, Boolean(options.restore))
    if (!result.ok) {
      setStorageWarning(result.message)
      return { ok: false, message: result.message }
    }
    current.current = result.value
    setLocal(result.value)
    setDamagedTheme(null)
    setStorageWarning('')
    return { ok: true }
  }

  function editDraft(edit: (invoice: Invoice) => Invoice) {
    setMessage(null)
    setEditor((active) =>
      active && active.invoice.id === draft?.id
        ? { invoice: edit(active.invoice), edited: true }
        : active,
    )
  }

  function show(next: Tab) {
    setTab(next)
    setEditor(null)
    setEditorConfirm(null)
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
    setBackupOpen(false)
    setBackupConfirm(null)
    setEditorConfirm(null)
    setSaveAttempted(false)
    setView('edit')
    setMessage(null)
    setEditor({ invoice, edited })
  }

  function closeEditor() {
    setEditor(null)
    setEditorConfirm(null)
    setSaveAttempted(false)
    setView('edit')
    setMessage(null)
    if (window.location.hash === '#editor') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }

  function saveEditor() {
    const data = current.current?.data
    if (!data || !draft) return
    const result = saveInvoice(data, draft)
    if (!result.ok) {
      setSaveAttempted(true)
      setMessage({ text: result.message, error: true })
      return
    }
    const committed = commit(result.data)
    if (!committed.ok) {
      setMessage({ text: committed.message, error: true })
      return
    }
    closeEditor()
    setMessage({ text: 'Invoice saved.' })
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

  function deleteInvoice(invoice: Invoice, insideEditor = false) {
    const setTargetConfirm = insideEditor ? setEditorConfirm : setConfirmModal
    setTargetConfirm({
      title: `Delete invoice ${invoice.number}?`,
      description:
        'This removes the saved invoice from history and cannot be undone without a backup.',
      confirmLabel: 'Delete invoice',
      danger: true,
      onConfirm: () => {
        const data = current.current?.data
        if (!data) return
        const remaining = data.invoices.filter((entry) => entry.id !== invoice.id)
        const committed = commit({ ...data, invoices: remaining })
        if (committed.ok) {
          if (insideEditor) closeEditor()
          setMessage({ text: 'Invoice deleted.' })
        } else if (insideEditor) {
          setMessage({ text: committed.message, error: true })
        }
      },
    })
  }

  function clearWorkspace(): { ok: true } | { ok: false; message: string } {
    const committed = commit(newWorkspace(), { restore: true })
    if (committed.ok) {
      show('invoices')
      setMessage({ text: 'Local workspace cleared.' })
    }
    return committed
  }

  async function downloadPdf(target: Invoice) {
    if (pdfBusyId !== null) return
    setPdfBusyId(target.id)
    setMessage(null)
    try {
      const { createInvoicePdf } = await loadPdfRenderer()
      const blob = await createInvoicePdf(target)
      downloadFile(blob, `${sanitizeFilename(target.number, 'invoice')}.pdf`)
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

  function toggleTheme() {
    const nextTheme: Theme = isDark ? 'light' : 'dark'
    const active = current.current
    if (!active) return
    if (active.damaged) {
      setDamagedTheme(nextTheme)
      return
    }
    commit({ ...active.data, theme: nextTheme })
  }

  const data = local?.data
  const copy = tabCopy[tab]
  const isSavedDraft =
    data && draft ? data.invoices.some((invoice) => invoice.id === draft.id) : false
  return (
    <div
      className="ic-workspace min-h-screen bg-ic-ground text-ic-ink print:block print:min-h-0 print:bg-white print:p-0 print:text-ic-ink"
      data-theme={theme}
    >
      <header className="ic-topbar bg-ic-deep text-white print:hidden">
        <div className={`${shellClass} flex min-h-16 items-center justify-between gap-4`}>
          <button
            type="button"
            className="inline-flex flex-none items-center gap-2.5 font-display text-[23px]/none font-[750] tracking-[-0.03em] whitespace-nowrap max-[480px]:gap-[7px] max-[480px]:text-[19px]"
            onClick={() => show('invoices')}
          >
            <span className="grid size-[34px] place-items-center rounded-[9px] bg-ic-stamp text-ic-deep max-[480px]:size-[31px]">
              <Icon name="mark" className="size-5 flex-none" />
            </span>{' '}
            Invoice Core
          </button>
          {data && (
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Dark mode"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="group relative inline-grid h-9 w-16 flex-none grid-cols-2 items-center rounded-[9px] border border-white/15 bg-black/20 p-[3px] transition-colors duration-150 hover:border-white/25 hover:bg-black/30 motion-reduce:transition-none"
              onClick={toggleTheme}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute top-[3px] left-[3px] size-7 rounded-md bg-white/15 shadow-[0_1px_2px_rgb(0_0_0/25%)] transition-transform duration-200 ease-out motion-reduce:transition-none ${isDark ? 'translate-x-full' : 'translate-x-0'}`}
              />
              <span
                aria-hidden="true"
                className={`relative z-1 grid size-7 place-items-center transition-colors duration-150 motion-reduce:transition-none ${isDark ? 'text-white/45 group-hover:text-white/75' : 'text-white'}`}
              >
                <Icon name="sun" className="size-[15px] flex-none" />
              </span>
              <span
                aria-hidden="true"
                className={`relative z-1 grid size-7 place-items-center transition-colors duration-150 motion-reduce:transition-none ${isDark ? 'text-white' : 'text-white/45 group-hover:text-white/75'}`}
              >
                <Icon name="moon" className="size-[15px] flex-none" />
              </span>
            </button>
          )}
        </div>
      </header>
      <main className={shellClass}>
        <div
          className="flex items-end justify-between gap-5 pt-8 pb-5 max-[900px]:pt-[25px] max-[900px]:pb-4 max-[620px]:flex-col max-[620px]:items-start max-[620px]:gap-3 print:hidden"
          data-panel={tab}
        >
          <div>
            <h1>{copy.title}</h1>
            <p className="mt-[9px] text-ic-muted">{copy.detail}</p>
          </div>
          {data && (
            <div className={`${actionsClass} flex-none`}>
              <button type="button" className={buttonClass} onClick={() => setBackupOpen(true)}>
                Backup
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => openEditor(newInvoice(undefined, data.invoices))}
              >
                <Icon name="plus" /> Create invoice
              </button>
            </div>
          )}
        </div>
        {storageWarning && (
          <p className={errorBannerClass} role="alert">
            {storageWarning}
          </p>
        )}
        {message && !editor && (
          <p
            className={message.error ? errorBannerClass : bannerClass}
            role={message.error ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}
        {!data && (
          <p className={bannerClass} role="status" data-invoice-shell="loading">
            Opening the local workspace…
          </p>
        )}
        {data && (
          <Tabs.Root
            className="grid gap-4 print:hidden"
            value={tab}
            onValueChange={(nextValue) => {
              if (
                nextValue === 'invoices' ||
                nextValue === 'products' ||
                nextValue === 'companies'
              ) {
                show(nextValue)
              }
            }}
          >
            <Tabs.List
              className="inline-grid grid-cols-3 gap-1 justify-self-start rounded-[10px] border border-ic-line bg-ic-soft p-1 max-[480px]:w-full max-[480px]:justify-self-stretch"
              aria-label="Workspace sections"
              activateOnFocus
            >
              {(Object.keys(tabs) as Tab[]).map((key) => (
                <Tabs.Tab
                  key={key}
                  value={key}
                  id={`tab-${key}`}
                  className="min-h-10 min-w-[112px] rounded-[7px] px-4 py-1.5 text-[13px] font-[730] text-ic-muted aria-selected:bg-ic-surface aria-selected:text-ic-ink aria-selected:shadow-[0_1px_3px_rgb(25_20_38/12%)] max-[480px]:min-w-0 max-[480px]:px-2 max-[480px]:py-1.5"
                >
                  {tabs[key]}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <Tabs.Panel value="invoices">
              <InvoiceHistory
                workspace={data}
                pdfBusyId={pdfBusyId}
                open={openEditor}
                downloadPdf={(invoice) => void downloadPdf(invoice)}
                duplicate={duplicateSavedInvoice}
                remove={(invoice) => deleteInvoice(invoice)}
              />
            </Tabs.Panel>
            <Tabs.Panel value="products">
              <ProductsPanel
                products={data.products}
                save={(product) => {
                  const latest = current.current?.data
                  if (!latest) return { ok: false }
                  const result = saveProduct(latest, product)
                  if (!result.ok) return result
                  const committed = commit(result.data)
                  if (!committed.ok) return committed
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
                      const committed = commit({
                        ...latest,
                        products: latest.products.filter(({ id }) => id !== product.id),
                      })
                      if (committed.ok) {
                        setMessage({ text: 'Product removed.' })
                      }
                    },
                  })
                }}
              />
            </Tabs.Panel>
            <Tabs.Panel value="companies">
              <Companies
                companies={data.companies}
                save={(company) => {
                  const latest = current.current?.data
                  if (!latest) return { ok: false }
                  const result = saveCompany(latest, company)
                  if (!result.ok) return result
                  const committed = commit(result.data)
                  if (!committed.ok) return committed
                  setMessage({ text: 'Sender profile saved.' })
                  return { ok: true }
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
                      const committed = commit({
                        ...latest,
                        companies: latest.companies.filter((entry) => entry.id !== company.id),
                      })
                      if (committed.ok) {
                        setMessage({ text: 'Sender profile removed.' })
                      }
                    },
                  })
                }}
              />
            </Tabs.Panel>
          </Tabs.Root>
        )}
        {data && (
          <WorkspaceDialog
            open={backupOpen}
            title="Backup"
            description="Export, restore, or clear the workspace on this device."
            onClose={() => {
              setBackupOpen(false)
              setBackupConfirm(null)
              if (window.location.hash === '#backup') {
                window.history.replaceState(
                  null,
                  '',
                  `${window.location.pathname}${window.location.search}`,
                )
              }
            }}
          >
            {backupOpen && (
              <Backup
                workspace={data}
                storageBytes={new Blob([local?.raw ?? JSON.stringify(data)]).size}
                damaged={local.damaged ? local.raw : null}
                restore={(restored) => {
                  const committed = commit(restored, { restore: true })
                  if (committed.ok) {
                    show('invoices')
                    setMessage({ text: 'Backup restored.' })
                  }
                  return committed
                }}
                clear={clearWorkspace}
                requestConfirm={setBackupConfirm}
              />
            )}
            <ConfirmModal confirm={backupConfirm} onClose={() => setBackupConfirm(null)} />
          </WorkspaceDialog>
        )}
        {data && (
          <WorkspaceDialog
            open={Boolean(draft)}
            title={isSavedDraft ? 'Invoice details' : 'New invoice'}
            description="Edit directly on the invoice. Only saved invoices are kept."
            size="wide"
            headerExtra={
              draft ? (
                <div
                  className={`${actionsClass} ic-editor-appearance items-end gap-2.5 max-[620px]:w-full [&>:not(:first-child)]:min-w-[136px] max-[620px]:[&>:not(:first-child)]:min-w-0 max-[620px]:[&>:not(:first-child)]:flex-1 [&>:nth-child(2)]:min-w-0`}
                >
                  <nav
                    className="ic-switcher inline-grid min-h-10 grid-cols-2 gap-[3px] rounded-lg border border-ic-line bg-ic-soft p-[3px] max-[620px]:w-full max-[620px]:flex-[1_1_100%]"
                    aria-label="Invoice view"
                  >
                    <button
                      type="button"
                      aria-pressed={view === 'edit'}
                      aria-controls="invoice-editor"
                      className="min-h-8 min-w-[74px] rounded-[5px] px-3 py-0 text-[13px] font-bold text-ic-muted transition-[background-color,color] duration-120 hover:text-ic-ink aria-pressed:bg-ic-surface aria-pressed:text-ic-ink aria-pressed:shadow-[0_1px_3px_rgb(25_20_38/12%)] motion-reduce:transition-none max-[620px]:min-w-0"
                      onClick={() => setView('edit')}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-pressed={view === 'preview'}
                      aria-controls="invoice-preview"
                      className="min-h-8 min-w-[74px] rounded-[5px] px-3 py-0 text-[13px] font-bold text-ic-muted transition-[background-color,color] duration-120 hover:text-ic-ink aria-pressed:bg-ic-surface aria-pressed:text-ic-ink aria-pressed:shadow-[0_1px_3px_rgb(25_20_38/12%)] motion-reduce:transition-none max-[620px]:min-w-0"
                      onClick={() => setView('preview')}
                    >
                      Preview
                    </button>
                  </nav>
                  <ColorPicker
                    label="Accent color"
                    value={resolveAccentColor(draft)}
                    defaultValue={defaultAccentColor}
                    onChange={(accentColor) =>
                      editDraft((current) => ({ ...current, accentColor }))
                    }
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
              ) : undefined
            }
            onClose={closeEditor}
          >
            {draft && (
              <div className="mt-3.5 print:m-0">
                <InvoiceEditor
                  key={draft.id}
                  draft={draft}
                  workspace={data}
                  edit={editDraft}
                  view={view}
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
                  onDelete={isSavedDraft ? () => deleteInvoice(draft, true) : undefined}
                />
              </div>
            )}
            <ConfirmModal confirm={editorConfirm} onClose={() => setEditorConfirm(null)} />
          </WorkspaceDialog>
        )}
        <footer className="flex flex-wrap justify-between gap-2 pt-[17px] pb-6 text-xs text-ic-muted print:hidden">
          <span>Invoice data stays in this browser. Keep a backup.</span>
          {offlineReady && <span role="status">Available offline</span>}
        </footer>
      </main>
      <ConfirmModal confirm={confirmModal} onClose={() => setConfirmModal(null)} />
    </div>
  )
}
