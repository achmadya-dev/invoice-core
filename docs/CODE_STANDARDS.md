# Code standards

This document is the normative implementation contract. Follow `AGENTS.md` and the accepted task. Resolve conflicts in this order: business invariants, security and data integrity, architecture, correctness and testability, simplicity, then performance backed by evidence.

## Boundaries

- Keep feature code under `src/modules/<domain>/`. The `domain/` directory holds pure rules, schemas, and deterministic calculations. Do not import React, routing, environment, network, browser storage, or database APIs there.
- Browser adapters (`*.browser.ts`) own storage, files, and offline setup. Do not access browser globals during SSR or module import. Routes compose features and declare metadata; they do not own persistence or calculation.
- Dependencies point inward: the UI and adapters may import domain contracts, never the reverse.
- Do not add abstractions, services, hooks, or dependencies without a concrete current need. Justify additions that represent a domain concept, isolate I/O, remove proven duplication, or improve safety and testability.

## TypeScript and failures

- Keep `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedIndexedAccess` enabled.
- Do not use `any` to bypass typing. Narrow `unknown` at untrusted boundaries. Do not cast away mismatches; document and prove any unavoidable assertion.
- Use discriminated results for expected failures and stable codes when callers need to distinguish them. Throw only for unexpected errors, programmer invariants, or explicit policy rejection.
- Keep functions small, public types focused, and effects explicit. Explain non-obvious invariants, not evident operations.
- Preserve the cause of unexpected errors when adding context. Report actionable failures without exposing private invoice data, secrets, stack traces, or raw infrastructure errors.

## Invoice data and offline state

- Treat form data, browser storage, imported files, URL parameters, and external responses as untrusted. Validate loaded and imported workspaces using the versioned domain schema.
- Keep active draft editing distinct from validation for a saved invoice. Use the domain calculation and document formatting instead of duplicating rules across the UI and PDF.
- Do not silently overwrite unreadable data or replace a workspace without confirmation. Preserve the storage key and backup schema or supply a reviewed and tested migration.
- Keep invoice content local. The service worker may cache the public shell and allowed static assets, not data, writes, API output, or private pages. Treat cache versions as independent of workspace versions.
- Do not add telemetry for invoice data or backup contents. Do not introduce hidden I/O, connections, or workers at import time.

## React and routes

- Use semantic controls, associated labels, visible focus, keyboard access, and useful status or error announcements. Represent loading, disabled, error, empty, and success states where relevant.
- Keep routes focused on data loading and presentation. Do not import secrets or server-only infrastructure into a client graph.
- For Tailwind, use canonical utilities for exact matches. Reach for arbitrary values only when no canonical utility fits; resolve `suggestCanonicalClasses` diagnostics rather than suppressing them.

## Future server features

Invoice Core does not require runtime credentials, a server database, or account infrastructure; do not introduce them without an approved product decision and ADR. Any future server endpoints must validate untrusted inputs at the server with the domain schema, enforce authorization before protected side effects, and keep database internals and secrets server-only.

## Verification and sensitive changes

- Test behavior at the cheapest applicable layer: unit tests for domain and validation, browser tests for workflows and keyboard access, and smoke tests for the built runtime. Include meaningful failure cases; do not mock the unit under test or reproduce its implementation in an assertion.
- Never weaken tests, lint, type checking, or security controls to obtain green results. Document any intentional change to the tested contract.
- Never commit or expose credentials, backups, or real invoice data. Use synthetic data. Keep development listeners on loopback unless exposure is explicitly approved and appropriately protected.
- Changes to auth, tenancy, money, migrations, dependencies, governance, or public exposure require explicit risk disclosure and review. Do not run destructive operations or deploy from routine task authorization.

## Required self-review

- The diff stays within scope and preserves product and data invariants.
- Dependencies point inward, untrusted inputs are validated, and authorization precedes any protected effect.
- No secrets, private data, storage internals, or server dependencies leak across boundaries.
- Tests cover success and important failures without weakening a check; docs and recovery instructions reflect contract changes.
- `bun run check` and relevant browser/production checks ran. Record actual results and any intentional exception before reporting completion.
