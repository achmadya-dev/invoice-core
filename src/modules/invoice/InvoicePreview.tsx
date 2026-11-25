import type { CSSProperties } from 'react'
import type { invoiceDocument } from './document'
import type { Currency, InvoiceLayout, InvoicePalette } from './domain/invoice'
import { deriveInvoicePalette, defaultAccentColor } from './domain/invoice'
import { docLabelClass } from './invoice-ui'

type DocumentProof = ReturnType<typeof invoiceDocument>

export const proofCardClass =
  'group/proof ic-proof mx-auto w-full bg-ic-paper p-[clamp(18px,3.1vw,41px)] text-ic-ink shadow-[0_10px_26px_#28204926] wrap-anywhere scheme-light max-[480px]:p-3.5 print:w-full print:max-w-none print:p-0 print:shadow-none'

export const summaryListBaseClass =
  'tabular-nums [&>div]:ml-auto [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div:not(.ic-amount)]:py-1 [&>div:not(.ic-amount)]:text-xs [&>div>dd]:shrink-0 [&>div>dd]:text-right [&>div>dd]:whitespace-nowrap'

export const amountCardClass =
  'ic-amount mt-2.5 flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[3px] bg-(--ic-doc-amount-bg) px-[15px] py-[13px] text-(--ic-doc-amount-ink) group-data-[invoice-layout=modern]/proof:rounded-md group-data-[invoice-layout=modern]/proof:border-l-4 group-data-[invoice-layout=modern]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:rounded-none group-data-[invoice-layout=minimal]/proof:border-t-2 group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=minimal]/proof:px-0 group-data-[invoice-layout=minimal]/proof:py-3 group-data-[invoice-layout=minimal]/proof:text-ic-ink'

export const proofHeadingVariantClass =
  'border-b-2 border-(--ic-doc-accent) pb-5 group-data-[invoice-layout=modern]/proof:rounded-md group-data-[invoice-layout=modern]/proof:border-t-4 group-data-[invoice-layout=modern]/proof:border-b-0 group-data-[invoice-layout=modern]/proof:border-t-(--ic-doc-accent) group-data-[invoice-layout=modern]/proof:bg-(--ic-doc-soft) group-data-[invoice-layout=modern]/proof:px-[18px] group-data-[invoice-layout=modern]/proof:py-4 group-data-[invoice-layout=minimal]/proof:border-b group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-line)'

export function invoicePaletteVars(palette: InvoicePalette): CSSProperties {
  return {
    '--ic-doc-accent': palette.accent,
    '--ic-doc-soft': palette.soft,
    '--ic-doc-amount-bg': palette.amountBg,
    '--ic-doc-amount-ink': palette.amountInk,
    '--ic-doc-line': palette.line,
  } as CSSProperties
}

function DocumentTotals({ proof, currency }: { proof: DocumentProof; currency: Currency }) {
  return (
    <div>
      <dl className={`mt-3.5 [&>div:not(.ic-amount)]:w-[min(100%,300px)] ${summaryListBaseClass}`}>
        {proof.summary.map((row, index) => (
          <div key={index}>
            <dt>{row.label}</dt>
            <dd>{row.amount}</dd>
          </div>
        ))}
        <div className={amountCardClass}>
          <dt className="shrink-0 font-display text-[15px]/[1.1] font-[750] whitespace-nowrap">
            Amount due <span className="mt-1 block font-mono text-xs/[1.4]">{currency}</span>
          </dt>
          <dd className="ml-auto font-display text-[clamp(18px,2.8vw,30px)]/[1.08] font-extrabold tracking-[-0.025em] [overflow-wrap:normal] [word-break:normal] whitespace-nowrap">
            {proof.total}
          </dd>
        </div>
      </dl>
      {proof.warning && <p className="mt-2.5 text-xs text-ic-error">{proof.warning}</p>}
    </div>
  )
}

export function InvoicePreview({
  proof,
  currency,
  accentColor = defaultAccentColor,
  layout = 'classic',
  palette = deriveInvoicePalette(accentColor),
  hidden,
}: {
  proof: DocumentProof
  currency: Currency
  accentColor?: string
  layout?: InvoiceLayout
  palette?: InvoicePalette
  hidden: boolean
}) {
  return (
    <article
      id="invoice-preview"
      className={`${proofCardClass} ${hidden ? 'hidden print:block' : ''}`}
      aria-label="Invoice document"
      data-invoice-accent={accentColor}
      data-invoice-layout={layout}
      style={invoicePaletteVars(palette)}
      data-print-only={hidden || undefined}
    >
      <header className={`flex items-start justify-between gap-3 ${proofHeadingVariantClass}`}>
        <div className="min-w-0">
          {proof.logo && (
            <img
              className="max-h-[60px] max-w-[132px] object-contain object-left"
              src={proof.logo}
              alt=""
            />
          )}
        </div>
        <div className="flex-[0_0_48%] text-right text-ic-muted">
          <h3 className="mb-2 font-display text-[clamp(26px,3.3vw,45px)]/[0.95] font-extrabold tracking-[-0.04em] text-(--ic-doc-accent)">
            Invoice
          </h3>
          <div className="font-mono text-xs/[1.4]">{proof.number}</div>
          <dl className="mt-2.5 flex flex-wrap justify-end gap-[18px] text-right text-xs">
            <div>
              <dt className={docLabelClass}>Issue date</dt>
              <dd className="mt-0.5 font-[690] text-ic-ink">{proof.issueDate}</dd>
            </div>
            {proof.dueDate && (
              <div>
                <dt className={docLabelClass}>Due date</dt>
                <dd className="mt-0.5 font-[690] text-ic-ink">{proof.dueDate}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>
      <div className="grid grid-cols-2 items-start gap-x-[clamp(12px,3vw,38px)] gap-y-3 py-[21px] max-[620px]:grid-cols-1">
        <div className="grid min-w-0 gap-0.5 text-xs whitespace-pre-line">
          <span className={docLabelClass}>From</span>
          <strong className="mb-[3px] font-display text-[clamp(14px,1.7vw,19px)]/[1.15] font-[750]">
            {proof.sender}
          </strong>
          {proof.senderDetails.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
        <div className="grid min-w-0 gap-0.5 text-xs whitespace-pre-line">
          <span className={docLabelClass}>Bill to</span>
          <strong className="mb-[3px] font-display text-[clamp(14px,1.7vw,19px)]/[1.15] font-[750]">
            {proof.client}
          </strong>
          {proof.clientDetails.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </div>
      <table className="ic-proof-table w-full border-collapse text-xs tabular-nums max-[480px]:text-[11px] [&_td]:border-b [&_td]:border-(--ic-doc-line) [&_td]:px-[7px] [&_td]:py-[9px] [&_td]:align-top max-[480px]:[&_td]:px-1 [&_td:not(:first-child)]:text-right [&_th]:bg-(--ic-doc-soft) [&_th]:px-[7px] [&_th]:py-[9px] [&_th]:text-left [&_th]:align-top [&_th]:text-(--ic-doc-amount-ink) group-data-[invoice-layout=minimal]/proof:[&_th]:border-y group-data-[invoice-layout=minimal]/proof:[&_th]:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:[&_th]:bg-transparent group-data-[invoice-layout=minimal]/proof:[&_th]:text-ic-ink max-[480px]:[&_th]:px-1 [&_th:not(:first-child)]:text-right">
        <caption className="sr-only">Invoice line items in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Qty</th>
            <th scope="col">Rate</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {proof.lines.length === 0 && (
            <tr>
              <td colSpan={4}>No line items</td>
            </tr>
          )}
          {proof.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.description}</td>
              <td>{line.quantity}</td>
              <td>{line.rate}</td>
              <td>{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <DocumentTotals proof={proof} currency={currency} />
      {proof.extras.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 text-xs whitespace-pre-line max-[620px]:grid-cols-1">
          {proof.extras.map((entry) => (
            <div
              key={entry.label}
              className="only:col-span-full data-wide:col-span-full"
              data-wide={entry.label === 'Payment details' || undefined}
            >
              <h4 className={docLabelClass}>{entry.label}</h4>
              <p>{entry.body}</p>
            </div>
          ))}
        </div>
      )}
      <footer className="mt-8 flex justify-between gap-3 border-t border-(--ic-doc-line) pt-[9px] text-[11px] text-ic-muted">
        <span>{proof.number}</span>
        <span>{currency}</span>
      </footer>
    </article>
  )
}
