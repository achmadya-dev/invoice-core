# Security Policy

## Architecture & Data Model

Invoice Core is a browser-local application with no backend API, user accounts, or server database. Invoices, products, company profiles, and logos are stored only in the user's browser (`localStorage`) for the current origin.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for suspected security vulnerabilities.

Instead, report vulnerabilities privately through [GitHub Security Advisories](https://github.com/achmadya-dev/invoice-core/security/advisories/new) (when enabled) or by contacting the repository maintainer (`@achmadya-dev`) privately with:

- A clear description of the issue and affected component or file paths.
- Minimal reproduction steps using **synthetic data only** (never include real invoices, backups, payment details, or credentials).
- Potential impact (for example XSS, prototype/backup parsing bypass, service worker caching of user data, or dependency exposure).

We will acknowledge receipt, investigate, and coordinate a fix before public disclosure.
