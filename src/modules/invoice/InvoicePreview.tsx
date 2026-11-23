import { invoiceDocument } from './document'
import type { Invoice } from './domain/invoice'
import { Icon } from './invoice-ui'

export function InvoicePreview({
  invoice,
  focused,
  onToggleFocus,
  onPrint,
}: {
  invoice: Invoice
  focused: boolean
  onToggleFocus: () => void
  onPrint: () => void
}) {
  const proof = invoiceDocument(invoice)
  return (
    <section className="ic-preview" id="invoice-preview" aria-labelledby="preview-title">
      <div className="ic-panel-bar">
        <h2 id="preview-title">
          <Icon name="document" /> Document preview
        </h2>
        <div className="ic-panel-actions">
          <button type="button" className="ic-preview-action" onClick={onPrint}>
            <Icon name="print" /> Print
          </button>
          <button
            type="button"
            className="ic-preview-action ic-desktop-preview"
            aria-pressed={focused}
            onClick={onToggleFocus}
          >
            <Icon name={focused ? 'collapse' : 'expand'} /> {focused ? 'Split view' : 'Expand'}
          </button>
        </div>
      </div>
      <div className="ic-proof-stage">
        <article className="ic-proof" aria-label="Invoice document">
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
              {invoice.dueDate && (
                <div>
                  <dt className="ic-doc-label">Due date</dt>
                  <dd>{proof.dueDate}</dd>
                </div>
              )}
            </dl>
          </div>
          <table className="ic-proof-table">
            <caption className="sr-only">Invoice line items in {invoice.currency}</caption>
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
          <dl className="ic-summary">
            {proof.summary.map((row, index) => (
              <div key={index}>
                <dt>{row.label}</dt>
                <dd>{row.amount}</dd>
              </div>
            ))}
            <div className="ic-amount">
              <dt>
                Amount due <span className="ic-mono">{invoice.currency}</span>
              </dt>
              <dd>{proof.total}</dd>
            </div>
          </dl>
          {!proof.valid && (
            <p className="ic-proof-warning">Correct the highlighted amounts to see the total.</p>
          )}
          {proof.extras.length > 0 && (
            <div className="ic-doc-extras">
              {proof.extras.map((entry) => (
                <div key={entry.label}>
                  <h4 className="ic-doc-label">{entry.label}</h4>
                  <p>{entry.body}</p>
                </div>
              ))}
            </div>
          )}
          <footer className="ic-doc-footer">
            <span>{proof.number}</span>
            <span>{invoice.currency}</span>
          </footer>
        </article>
        <div className="ic-stage-foot">
          <span>Live preview</span>
          <span className="ic-mono">PRINT PROOF</span>
        </div>
      </div>
    </section>
  )
}
