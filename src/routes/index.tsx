import { createFileRoute } from '@tanstack/react-router'
import { InvoiceWorkspace } from '../modules/invoice/InvoiceWorkspace'
import invoiceStyles from '../modules/invoice/invoice.css?url'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Invoice Core — Invoice editor' },
      { name: 'description', content: 'Create, review, and export invoices on your device.' },
      { name: 'theme-color', content: '#282049' },
    ],
    links: [
      { rel: 'stylesheet', href: invoiceStyles },
      { rel: 'icon', href: '/invoice-mark.svg', type: 'image/svg+xml' },
      { rel: 'manifest', href: '/invoice.webmanifest' },
      { rel: 'apple-touch-icon', href: '/invoice-192.png' },
    ],
  }),
  component: InvoiceWorkspace,
})
