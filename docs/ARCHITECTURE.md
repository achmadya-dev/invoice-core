# Architecture

## Runtime

Invoice Core is a single TanStack Start application. Bun serves the Nitro build, and `/` renders a public invoice shell. There is no application authentication, account API, server database, or server-side invoice storage. The browser loads its workspace after hydration.

## Invoice boundaries

- `src/routes/` owns route metadata, initial HTML and the not-found and error states. `/` is the only product route.
- `src/modules/invoice/` owns editing, preview, searchable history, sender profiles, backup/restore, and theme.
- `domain/` owns the versioned workspace schema, invoice and numbering invariants, and decimal calculations. It does not import React or browser I/O.
- `workspace.browser.ts` owns browser storage and file I/O. It validates stored or imported data before use and does not overwrite unreadable data without confirmation.
- `document.ts` translates one invoice into formatted document data for the preview and the client-only PDF renderer.

## Offline and release

The production service worker caches only the public invoice shell and same-origin static assets. It does not cache user data, arbitrary routes, or writes. The worker updates independently of the Local Storage workspace schema. See the [recovery runbook](runbooks/RECOVERY.md) before an origin change or rollback.

Maintainers should verify HTTPS, asset and manifest availability, offline reopening, and backup restoration before releasing. No credential or migration step is needed.

## History

[ADR 0003](adr/0003-browser-local-invoice-workspace.md) retires the previous authentication and server database choices. The original SQL remains in [the migration archive](../db/migrations/README.md); the current application cannot run it.
