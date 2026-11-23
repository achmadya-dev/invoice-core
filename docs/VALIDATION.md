# Verification

Use the pinned Bun version and Node 26 for tooling. Install Chromium with `bunx playwright install chromium`.

- `bun run check`: formatting, lint, policy tests, invoice domain and backup tests, Bun build, and type checking.
- `bun run test:e2e`: editor, history, profiles, backup/restore, PDF, accessibility, and mobile behavior against the local development server.
- `bun run test:production`: HTTP 200 for the invoice shell and HTTP 404 for removed login and account routes, using an existing production build.
- `bun run test:offline`: offline reload and PDF download in Chromium against an existing production build.
- `bun run verify`: all of the above in order. No database or credentials are needed.

Record the tested commit and actual results in the pull request. Never claim these local checks represent hosted CI.
