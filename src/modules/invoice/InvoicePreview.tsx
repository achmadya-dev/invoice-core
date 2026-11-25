import type { CSSProperties } from 'react'
import type { invoiceDocument } from './document'
import type { Currency, InvoiceLayout, InvoicePalette } from './domain/invoice'
import { deriveInvoicePalette, defaultAccentColor } from './domain/invoice'

type DocumentProof = ReturnType<typeof invoiceDocument>

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
      <dl className="ic-summary">
        {proof.summary.map((row, index) => (
          <div key={index}>
            <dt>{row.label}</dt>
            <dd>{row.amount}</dd>
          </div>
        ))}
        <div className="ic-amount">
          <dt>
            Amount due <span className="ic-mono">{currency}</span>
          </dt>
          <dd>{proof.total}</dd>
        </div>
      </dl>
      {proof.warning && <p className="ic-proof-warning">{proof.warning}</p>}
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
      className="ic-proof"
      aria-label="Invoice document"
      data-invoice-accent={accentColor}
      data-invoice-layout={layout}
      style={invoicePaletteVars(palette)}
      data-print-only={hidden || undefined}
    >
      <header className="ic-doc-heading">
        <div className="ic-doc-brand">
          {proof.logo && <img className="ic-logo" src={proof.logo} alt="" />}
        </div>
        <div className="ic-doc-title">
          <h3>Invoice</h3>
          <div className="ic-mono">{proof.number}</div>
          <dl className="ic-doc-dates">
            <div>
              <dt className="ic-doc-label">Issue date</dt>
              <dd>{proof.issueDate}</dd>
            </div>
            {proof.dueDate && (
              <div>
                <dt className="ic-doc-label">Due date</dt>
                <dd>{proof.dueDate}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>
      <div className="ic-doc-meta">
        <div className="ic-party">
          <span className="ic-doc-label">From</span>
          <strong>{proof.sender}</strong>
          {proof.senderDetails.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
        <div className="ic-party">
          <span className="ic-doc-label">Bill to</span>
          <strong>{proof.client}</strong>
          {proof.clientDetails.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </div>
      <table className="ic-proof-table">
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
        <div className="ic-doc-extras">
          {proof.extras.map((entry) => (
            <div key={entry.label} data-wide={entry.label === 'Payment details' || undefined}>
              <h4 className="ic-doc-label">{entry.label}</h4>
              <p>{entry.body}</p>
            </div>
          ))}
        </div>
      )}
      <footer className="ic-doc-footer">
        <span>{proof.number}</span>
        <span>{currency}</span>
      </footer>
    </article>
  )
}
