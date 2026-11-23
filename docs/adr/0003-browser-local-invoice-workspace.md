# ADR 0003 — Browser-local invoice workspace

Status: accepted, 2026-11-23

Issue: [#5](https://github.com/achmadya-dev/invoice-core/issues/5)

## Context

Invoice Core invoices, history, sender profiles, and backups already live in a browser profile. The inherited login and server database did not protect, own, or synchronize them. Retaining unused authentication and persistence misrepresented what the application could do.

## Decision

Remove account routes, auth services, and unused server persistence. Preserve the existing invoice storage key and backup schema. Keep the old SQL migration files byte-for-byte for history and recovery, but do not ship or run a migration runner. This supersedes the runtime and provider choices in ADRs 0001 and 0002.

Hiding only the sign-in link would leave an unused auth surface. Connecting invoice storage to accounts would create synchronization, authorization, and recovery requirements outside the product scope.

## Consequences and evaluation

No account or database setup is required. Workspace ownership remains the browser profile and origin; moving data requires an explicit JSON export and restore. Verify former login/account URLs are unavailable and an existing browser draft survives the transition and works offline. If shared storage is proposed later, consider a new decision and migration plan rather than reactivating the historical migrations.
