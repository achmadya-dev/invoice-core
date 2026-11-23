import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import styleUrl from '../styles.css?url'
import invoiceStyles from '../modules/invoice/invoice.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Invoice Core' },
    ],
    links: [
      { rel: 'stylesheet', href: styleUrl },
      { rel: 'stylesheet', href: invoiceStyles },
      { rel: 'icon', href: '/invoice-mark.svg', type: 'image/svg+xml' },
    ],
  }),
  component: Root,
  notFoundComponent: () => (
    <RouteMessage title="Page not found" detail="Open the Invoice Core editor to continue.">
      <Link to="/" className="ic-button ic-primary">
        Back to editor
      </Link>
    </RouteMessage>
  ),
  errorComponent: () => (
    <RouteMessage title="Could not open Invoice Core" detail="Reload the page to try again.">
      <a href="/" className="ic-button ic-primary">
        Reload editor
      </a>
    </RouteMessage>
  ),
})

function RouteMessage({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children: ReactNode
}) {
  return (
    <div className="ic-workspace" data-theme="system">
      <main className="ic-shell">
        <div className="ic-heading">
          <div>
            <h1>{title}</h1>
            <p>{detail}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
