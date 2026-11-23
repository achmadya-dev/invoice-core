import type { invoiceDocument } from './document'
import type { Currency } from './domain/invoice'

type DocumentProof = ReturnType<typeof invoiceDocument>

export function DocumentTotals({ proof, currency }: { proof: DocumentProof; currency: Currency }) {
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
  hidden,
}: {
  proof: DocumentProof
  currency: Currency
  hidden: boolean
}) {
  return (
    <article
      id="invoice-preview"
      className="ic-proof"
      aria-label="Invoice document"
      data-print-only={hidden || undefined}
    >
      <header className="ic-doc-heading">
        <div className="ic-party">
          {proof.logo && <img className="ic-logo" src={proof.logo} alt="" />}
          <strong>{proof.sender}</strong>
          {proof.senderDetails.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
        <div className="ic-doc-title">
          <h3>Invoice</h3>
          <div className="ic-mono">{proof.number}</div>
        </div>
      </header>
      <div className="ic-doc-meta">
        <div className="ic-party">
          <span className="ic-doc-label">Bill to</span>
          <strong>{proof.client}</strong>
          {proof.clientDetails.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
        <dl>
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
