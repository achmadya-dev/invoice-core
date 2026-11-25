# Contributing to Invoice Core

Thank you for helping improve Invoice Core! This is a local-first, browser-only invoice application with no login, database, or server storage.

## Prerequisites

- [Bun](https://bun.sh/) matching [`.bun-version`](.bun-version)
- [Node.js](https://nodejs.org/) matching [`.nvmrc`](.nvmrc) (used by Vitest, Playwright, and policy tests)
- Chromium for Playwright (`bunx playwright install chromium`) and optionally `poppler-utils` (`pdftotext`) for PDF content checks

## Local setup

```sh
bun install --frozen-lockfile
bun run dev
```

## Verification

Before opening a pull request:

```sh
bun run check   # format check, lint, policy tests, unit tests, production build, typecheck
bun run verify  # full suite including Playwright E2E, production smoke, and offline tests
```

## Workflow and standards

1. Read [`AGENTS.md`](AGENTS.md), [`docs/CODE_STANDARDS.md`](docs/CODE_STANDARDS.md), and [`docs/PATTERNS.md`](docs/PATTERNS.md) before making changes.
2. Start from or open a GitHub issue, work on a dedicated branch (not `main`), and follow [Conventional Commits](docs/COMMITS.md).
3. Use synthetic test data only — never commit real invoices, company logos, backups, or credentials.
4. Complete the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) and verify it locally against [`scripts/check-pr.mjs`](scripts/check-pr.mjs). See [`docs/WORKFLOW.md`](docs/WORKFLOW.md) for details.
