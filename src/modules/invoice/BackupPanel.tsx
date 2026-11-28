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

const statCapClass = 'text-xs font-normal text-ic-muted'
const statValueClass = 'mt-1 font-mono text-[15px]/tight font-bold tabular-nums text-ic-ink'
const statLabelClass = 'text-xs font-medium text-ic-muted'

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
        <dl className="grid grid-cols-4 border-y border-ic-line max-[620px]:grid-cols-2">
          <div className="min-w-0 py-3 pr-3">
            <dt className={statLabelClass}>Saved invoices</dt>
            <dd className={statValueClass}>
              {workspace.invoices.length}
              <span className={statCapClass}> / {maxInvoices}</span>
            </dd>
          </div>
          <div className="min-w-0 border-l border-ic-line px-3 py-3">
            <dt className={statLabelClass}>Sender profiles</dt>
            <dd className={statValueClass}>
              {workspace.companies.length}
              <span className={statCapClass}> / {maxCompanies}</span>
            </dd>
          </div>
          <div className="min-w-0 border-l border-ic-line px-3 py-3 max-[620px]:border-t max-[620px]:border-l-0 max-[620px]:pl-0">
            <dt className={statLabelClass}>Products</dt>
            <dd className={statValueClass}>
              {workspace.products.length}
              <span className={statCapClass}> / {maxProducts}</span>
            </dd>
          </div>
          <div className="min-w-0 border-l border-ic-line py-3 pl-3 max-[620px]:border-t">
            <dt className={statLabelClass}>Storage used</dt>
            <dd className={statValueClass}>
              {formatBytes(storageBytes)}
              <span className={statCapClass}> / {formatBytes(maxBackupBytes)}</span>
            </dd>
          </div>
        </dl>
      </section>
      <div className="divide-y divide-ic-line">
        <section className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-1">
          <div className="min-w-0 flex-[1_1_280px]">
            <h2 className="m-0 font-display text-sm/tight font-bold text-ic-ink">
              Export a backup
            </h2>
            <p className="mt-1 text-[13px]/normal text-ic-muted">
              Download a JSON copy of saved invoices, company profiles, products, and settings.
              Store it somewhere private.
            </p>
          </div>
          <div className={`${actionsClass} shrink-0`}>
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
        <section className="py-3.5 last:pb-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-[1_1_280px]">
              <h2 className="m-0 font-display text-sm/tight font-bold text-ic-ink">
                Restore a backup
              </h2>
              <p className="mt-1 text-[13px]/normal text-ic-muted">
                Replace local workspace data from a validated .json backup (up to 8 MB). Export a
                copy first.
              </p>
            </div>
            <label
              className={`${buttonClass} relative shrink-0 cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ic-accent`}
            >
              <Icon name="upload" />
              <span>Choose backup file</span>
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
            <p className="ic-error mt-2.5 text-[13px] text-ic-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      <section
        className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-ic-error/30 bg-ic-error-bg/50 px-4 py-3.5"
        aria-label="Reset local data"
      >
        <div className="min-w-0 flex-[1_1_280px]">
          <h2 className="m-0 font-display text-sm/tight font-bold text-ic-ink">Reset local data</h2>
          <p className="mt-1 text-[13px]/normal text-ic-muted">
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
