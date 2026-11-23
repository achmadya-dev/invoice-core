# Invoice Core

A local-first invoice editor with a live preview, downloadable A4 PDF, reusable company profiles, and searchable history. There is no login, server database, or cloud sync.

## Run locally

Use the Bun version in [`.bun-version`](.bun-version). Node 26 is used by the test tooling, not the application runtime.

```sh
bun install --frozen-lockfile
bun run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). No `.env` file or database setup is required.

## Use the workspace

- **Editor:** choose a sender, fill in billing details and items, then review the live document. On mobile, switch between Edit and Preview. Use **Save invoice** to add or update a history record.
- **History and companies:** search, reopen, or duplicate invoices. Manage sender profiles, logos, and invoice numbering. Changes to a profile do not rewrite older invoices.
- **PDF:** download directly or use **Print / Save as PDF** for scripts not covered by the embedded Latin, Greek, and Cyrillic font.
- **Backup:** invoices, settings, and the working draft belong to the current browser profile and origin. Download a private JSON backup before clearing site data or moving to another address.
- **Offline:** supported browsers can reopen and install the production workspace after **Available offline** appears. Use HTTPS or localhost.

## Verify

```sh
bunx playwright install chromium
bun run verify
```

`bun run check` runs formatting, lint, policy tests, unit tests, the Bun build, and type checks. `bun run verify` also runs browser tests, the production route smoke test, and the offline suite. See [verification](docs/VALIDATION.md) for the individual checks.

## Run a production build locally

```sh
bun run build
HOST=127.0.0.1 PORT=3000 bun run start
```

Alternatively, build the standalone image with `docker build -t invoice-core .` and run `docker run --rm -p 127.0.0.1:3000:3000 invoice-core`. The container serves the application; browser-local invoices are not stored in the container. Follow the [recovery runbook](docs/runbooks/RECOVERY.md) for origin changes and rollbacks.

## Development

Start with [the development guide](START_HERE.md) and [repository instructions](AGENTS.md). See [product scope](docs/PRODUCT.md), [invoice rules](docs/DOMAIN.md), [architecture](docs/ARCHITECTURE.md), and [design](docs/DESIGN.md) before changing behavior.
