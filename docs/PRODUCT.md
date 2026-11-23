# Product context

Invoice Core is a browser-local invoice editor for freelancers, independent studios, and small teams whose invoicing work stays on one device.

## Main workflow

Choose a sender profile, enter invoice and billing details, add line items, and check the live document before saving or downloading it as an A4 PDF. On mobile, switch between Edit and Preview without losing work. The app keeps one active draft automatically; Save invoice adds or updates a record in history. History supports search, company and status filtering, inline status updates, direct PDF download, reopening, duplication, and deletion. Backup shows local storage usage and supports JSON export, validated restore, and confirmed workspace clearing.

Use **Templates** to create, edit, and delete reusable bundles of item descriptions, quantities, and rates. In **Editor → Line items**, apply a custom or starter template. A custom template uses its saved currency, and applying one replaces existing populated lines only after confirmation. Custom templates are stored in the local workspace and included in backups.

## Data and access

No login is required. Invoice data, company profiles, logos, and theme are stored in the browser profile for the current origin. They are not encrypted by the app or synchronized. Use a dedicated browser profile on a shared device and edit the workspace in one tab at a time. Export a private JSON backup before clearing site data, moving origins, or replacing the workspace. Restore accepts Invoice Core backups only.

The built workspace can be installed and reopened offline in supported browsers after preparation on HTTPS or localhost.

## Out of scope

Status labels are manual. The app does not send invoices, move money, convert currencies, file taxes, synchronize a team, or provide a public automation API or account system.
