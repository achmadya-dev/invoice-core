import { createClientOnlyFn } from '@tanstack/react-start'

// Keep the browser PDF renderer out of the SSR/Nitro load graph.
export const loadPdfRenderer = createClientOnlyFn(() => import('./InvoicePdf'))
