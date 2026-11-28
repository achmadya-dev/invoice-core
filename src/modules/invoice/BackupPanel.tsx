import { useEffect, useRef, useState } from 'react'
import {
  backupFilename,
  formatBytes,
  maxBackupBytes,
  maxCompanies,
  maxInvoices,
  maxProducts,
  type Workspace,
} from './domain/invoice'
import {
  actionsClass,
  buttonClass,
  dangerButtonClass,
  Icon,
  primaryButtonClass,
  type ConfirmState,
} from './invoice-ui'
import { decodeWorkspace, downloadFile, validateWorkspaceLogos } from './workspace.browser'

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
  restore: (data: Workspace) => { ok: true } | { ok: false; message?: string }
  clear: () => { ok: true } | { ok: false; message?: string }
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
            <dd className={statValueClass}>
              {formatBytes(storageBytes)}
              <span className={statCapClass}> / {formatBytes(maxBackupBytes)}</span>
            </dd>
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
                  backupFilename(),
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
            <label className="relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-ic-accent/45 bg-ic-field px-3 py-2 text-ic-accent transition-[border-color,background-color] duration-140 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ic-accent hover:border-ic-accent hover:bg-ic-soft">
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
                    if (!data) {
                      setError(
                        'This is not a valid Invoice Core backup (maximum 8 MB). Nothing was replaced.',
                      )
                      return
                    }
                    const validLogos = await validateWorkspaceLogos(data)
                    if (attempt !== importAttempt.current) return
                    if (!validLogos) {
                      setError(
                        'This backup contains an invalid or oversized logo image. Nothing was replaced.',
                      )
                      return
                    }
                    requestConfirm({
                      title: 'Restore backup?',
                      description: `${data.invoices.length} saved invoice(s), ${data.companies.length} sender profile(s), and ${data.products.length} product(s). Replace the local workspace with this backup?`,
                      confirmLabel: 'Replace local workspace',
                      cancelLabel: 'Cancel restore',
                      danger: true,
                      onConfirm: () => {
                        const result = restore(data)
                        if (!result.ok) {
                          setError(
                            result.message ?? 'The backup could not be saved to browser storage.',
                          )
                        }
                      },
                    })
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
                const result = clear()
                if (result.ok) setError('')
                else {
                  setError(result.message ?? 'The local workspace could not be cleared.')
                }
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
