import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import styleUrl from '../styles.css?url'
import { primaryButtonClass, shellClass } from '../modules/invoice/invoice-ui'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Invoice Core' },
    ],
    links: [
      { rel: 'stylesheet', href: styleUrl },
      { rel: 'icon', href: '/invoice-mark.svg', type: 'image/svg+xml' },
    ],
  }),
  component: Root,
  notFoundComponent: () => (
    <RouteMessage title="Page not found" detail="Open the Invoice Core editor to continue.">
      <Link to="/" className={primaryButtonClass}>
        Back to invoices
      </Link>
    </RouteMessage>
  ),
  errorComponent: () => (
    <RouteMessage title="Could not open Invoice Core" detail="Reload the page to try again.">
      <a href="/" className={primaryButtonClass}>
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
    <div className="ic-workspace min-h-screen bg-ic-ground text-ic-ink">
      <main className={shellClass}>
        <div className="flex items-end justify-between gap-5 pt-8 pb-5 max-[900px]:pt-[25px] max-[900px]:pb-4 max-[620px]:flex-col max-[620px]:items-start max-[620px]:gap-3">
          <div>
            <h1>{title}</h1>
            <p className="mt-[9px] text-ic-muted">{detail}</p>
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
