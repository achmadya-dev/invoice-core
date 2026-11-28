# Architecture

## Runtime

Invoice Core is a single TanStack Start application. Bun serves the Nitro build, and `/` renders a public invoice shell. There is no application authentication, account API, server database, or server-side invoice storage. The browser loads its workspace after hydration.

## Invoice boundaries

- `src/routes/` owns route metadata, initial HTML (`data-theme="system"` for SSR dark/light alignment), and the not-found and error states. `/` is the only product route.
- `src/modules/invoice/` owns editing, preview, searchable/paginated history, reusable catalog (`ProductsPanel.tsx`, `CompaniesPanel.tsx`), backup/restore (`BackupPanel.tsx`), and the light/dark workspace UI (including the topbar theme switch, persisted `theme` preference in backups, and in-dialog storage error surfacing).
- `domain/` owns the versioned workspace schema (including PNG/JPEG magic-byte prefix checks and control/BiDi character rejection), invoice and numbering invariants, filename sanitization, WCAG contrast derivation for custom accent palettes, and decimal calculations. It does not import React or browser I/O.
- `workspace.browser.ts` owns browser storage and file I/O. It enforces UTF-8 byte limits on decoded backups, validates stored or imported data plus async logo image bytes/dimensions (`<= 4096×4096`) before use, and does not overwrite unreadable data without confirmation.
- `document.ts` translates one invoice into formatted document data (and shared calculated totals) for the preview and the client-only PDF renderer (`noto-sans-regular.ttf` and `noto-sans-bold.ttf`).

## Offline and release

The production service worker caches only the public invoice shell (`data-invoice-shell="loading"` marker) and same-origin static assets (including `noto-sans-regular.ttf` and `noto-sans-bold.ttf`) using credential-less fetches and per-URL parsing isolation. It does not cache user data, arbitrary routes, or writes. The worker updates independently of the Local Storage workspace schema. See the [recovery runbook](runbooks/RECOVERY.md) before an origin change or rollback.

Nitro `routeRules` in [`vite.config.ts`](../vite.config.ts) configure default response security headers (`Content-Security-Policy` with `frame-ancestors 'none'` and `frame-src 'none'`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`) and `Cache-Control: no-cache, must-revalidate` for `/invoice-sw.js` while keeping immutable caching for hashed `/assets/**`. `script-src` currently keeps `'unsafe-inline'` alongside `'wasm-unsafe-eval'` because TanStack Start's default server entry does not propagate per-request `ssr.nonce` into `getRouter`. Production HTTPS reverse proxies should additionally set `Strict-Transport-Security` (HSTS).

Maintainers should verify HTTPS, asset and manifest availability, offline reopening, and backup restoration before releasing. No credential or migration step is needed.

## History

[ADR 0003](adr/0003-browser-local-invoice-workspace.md) retires the previous authentication and server database choices. Inherited template SQL migration files were removed from the working tree in PR #27 (recoverable only from earlier Git history); the current application has no database or migration runner.
