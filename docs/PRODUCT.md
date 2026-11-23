# Product context

Invoice Core is a browser-local invoice editor for freelancers, independent studios, and small teams whose invoicing work stays on one device.

## Main workflow

**Invoices** is the landing list. Search or filter saved invoices by company. The list is paginated and sorts by newest issue date first. Download PDFs, reopen, duplicate, or delete records. **Create invoice** opens an empty form with a suggested invoice number; duplicating opens a new draft populated from the source invoice with a new number. Neither action adds a record until the draft is explicitly created. Open a saved invoice and use **Save changes** to update it. One active draft is kept locally; return to it using **Resume draft**.

Use the optional **Company** and **Add product** pickers at the top of the editor to copy sender defaults or add a single priced line from the catalog. Everything can also be entered manually. The **Client** field searches prior invoices or accepts a new name inline. **Catalog** includes searchable **Products** and **Companies** panels that use dialogs for editing. From **Invoices → Backup**, change theme, export JSON, restore a validated backup, or confirm clearing the workspace.

The preview and A4 PDF use the same invoice values and money formatting. Download a PDF directly from the current preview even when the draft is incomplete; this does not save the invoice. On mobile, switch between Edit and Preview without losing the draft.

## Data and access

No login is required. Invoice data, products, company profiles, logos, and theme are stored in the browser profile for the current origin. They are not encrypted by the app or synchronized. Use a dedicated browser profile on a shared device and edit the workspace in one tab at a time. Export a private JSON backup before clearing site data, moving origins, or replacing the workspace. Restore accepts Invoice Core backups only.

The built workspace can be installed and reopened offline in supported browsers after preparation on HTTPS or localhost.

## Out of scope

The app does not track payment or sending status, send invoices, move money, convert currencies, file taxes, synchronize a team, or provide a public automation API or account system.
