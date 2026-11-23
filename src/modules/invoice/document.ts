import { countryName } from './domain/catalog'
import {
  formatDate,
  formatMoney,
  formatRate,
  invoiceTotals,
  type Contact,
  type Invoice,
} from './domain/invoice'

export function contactLines(contact: Contact) {
  return [contact.address, countryName(contact.country), contact.email, contact.phone].filter(
    Boolean,
  )
}

export function invoiceDocument(invoice: Invoice) {
  const totals = invoiceTotals(invoice)
  const money = (value: bigint) => formatMoney(value, invoice.currency)
  const summary = totals ? [{ label: 'Subtotal', amount: money(totals.subtotal) }] : []
  if (totals && totals.discount !== 0n)
    summary.push({ label: 'Discount', amount: money(-totals.discount) })
  if (totals && (totals.tax !== 0n || Number(invoice.taxRate) > 0)) {
    summary.push({
      label: `${invoice.taxLabel.trim() || 'Tax'} (${invoice.taxRate}%)`,
      amount: money(totals.tax),
    })
  }
  if (totals && totals.shipping !== 0n)
    summary.push({ label: 'Shipping', amount: money(totals.shipping) })

  return {
    sender: invoice.sender.name || 'Sender name',
    logo: invoice.sender.logo,
    senderDetails: [
      ...contactLines(invoice.sender),
      invoice.sender.website,
      invoice.sender.taxId ? `Tax ID: ${invoice.sender.taxId}` : '',
    ].filter(Boolean),
    client: invoice.client.name || 'Client name',
    clientDetails: contactLines(invoice.client),
    number: invoice.number || 'Unnumbered',
    issueDate: formatDate(invoice.issueDate),
    dueDate: formatDate(invoice.dueDate),
    lines: invoice.items.map((item, index) => ({
      id: item.id,
      description: item.description || 'Untitled item',
      quantity: item.quantity || '0',
      rate: formatRate(item.rate, invoice.currency),
      amount: totals && totals.lines[index] !== undefined ? money(totals.lines[index]) : '—',
    })),
    summary,
    total: totals ? money(totals.total) : '—',
    valid: Boolean(totals),
    extras: [
      { label: 'Notes', body: invoice.notes },
      { label: 'Terms', body: invoice.terms },
      { label: 'Payment details', body: invoice.sender.paymentDetails },
    ].filter(({ body }) => body.trim()),
  }
}
