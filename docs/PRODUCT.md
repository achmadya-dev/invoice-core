# Product context

Invoice Core is a browser-local invoice editor for freelancers, independent studios, and small teams whose invoicing work stays on one device.

## Main workflow

Choose a sender profile, enter invoice and billing details, add line items, and check the live document before saving or downloading it as an A4 PDF. On mobile, switch between Edit and Preview without losing work. The app keeps one active draft automatically; Save invoice adds or updates a record in history. History supports search, company filtering, reopening, and duplication.

## Data and access

Invoice data, company profiles, logos, and theme are stored in the browser profile for the current origin. They do not belong to a signed-in account, are not encrypted by the app, and are not synchronized. Use a dedicated browser profile on a shared device and edit the workspace in one tab at a time. Export a private JSON backup before clearing site data, moving origins, or replacing the workspace. Restore accepts Invoice Core backups only.

The built workspace can be installed and reopened offline in supported browsers after preparation on HTTPS or localhost. Account and API routes are not part of the offline workspace.

## Out of scope

Status labels are manual. The app does not send invoices, move money, convert currencies, file taxes, synchronize a team, or provide a public automation API. The existing, optional authentication scaffold is unrelated to invoice storage; public registration and OAuth remain disabled. No database connection is required for invoicing.
