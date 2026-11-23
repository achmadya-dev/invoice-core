import { createFileRoute } from '@tanstack/react-router'
import { InvoiceWorkspace } from '../modules/invoice/InvoiceWorkspace'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Invoice Core — Invoices' },
      { name: 'description', content: 'Create, review, and export invoices on your device.' },
      { name: 'theme-color', content: '#282049' },
    ],
    links: [
      { rel: 'manifest', href: '/invoice.webmanifest' },
      { rel: 'apple-touch-icon', href: '/invoice-192.png' },
    ],
  }),
  component: InvoiceWorkspace,
})
