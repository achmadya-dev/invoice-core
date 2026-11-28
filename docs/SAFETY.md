# Safety boundaries

Invoice Core needs no account credentials or server database. Invoices and backups can still contain private contact and payment details. Use synthetic data for tests and screenshots; never publish a real backup or invoice as evidence.

## Risk

- Low: narrow changes with no impact on data, access, or contracts.
- Medium: ordinary feature logic with localized impact.
- High: authentication, tenancy, money, migrations, dependencies, governance, or external side effects.

The PR verifier checks metadata and sensitive-path hints, not correctness, security, or independent review. Check the trusted base revision's verifier and record local verification separately from any hosted checks.

## Data and release

- Keep invoice data out of network requests, service worker caches, analytics, and logs. Validate JSON backups (including UTF-8 byte limits, control/BiDi character rejection, PNG/JPEG magic bytes, and async `<= 4096×4096` logo pixel bounds) before asking to replace local state.
- Use a dedicated browser profile on shared devices. Back up before changing origin or clearing browser storage; see [recovery](runbooks/RECOVERY.md).
- Keep development services on loopback. Production HTTPS edges should terminate TLS and set `Strict-Transport-Security` (HSTS). No production access, deployment, data deletion, or migration is authorized by ordinary implementation work.
- Historical template SQL migrations were removed from the working tree (PR #27) and remain only in earlier Git history. Never run historical SQL or delete data from an existing database as part of application cleanup.
