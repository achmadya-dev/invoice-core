# Product context

Invoice Core is a browser-local invoice editor for freelancers, independent studios, and small teams whose invoicing work stays on one device.

## Main workflow

**Invoices** is the landing list. Search or filter saved invoices, update their status, download PDFs, reopen, duplicate, or delete records. **Create invoice** opens a blank draft; duplicating opens a new draft populated from the source invoice. Neither action adds a record until the draft is explicitly created. Open a saved invoice and use **Save changes** to update it. One active draft is kept locally; return to it using **Resume draft**.

Use the optional **Company** and **Add product** pickers at the top of the editor to copy sender defaults or add a single priced line from the catalog. Everything can also be entered manually. The **Client** field searches prior invoices or accepts a new name inline. **Products** and **Companies** use dialogs for editing. From **Invoices → Backup**, export JSON, restore a validated backup, or confirm clearing the workspace.

The preview and A4 PDF use the same invoice values and money formatting. On mobile, switch between Edit and Preview without losing the draft.

## Data and access

No login is required. Invoice data, products, company profiles, logos, and theme are stored in the browser profile for the current origin. They are not encrypted by the app or synchronized. Use a dedicated browser profile on a shared device and edit the workspace in one tab at a time. Export a private JSON backup before clearing site data, moving origins, or replacing the workspace. Restore accepts Invoice Core backups only.

The built workspace can be installed and reopened offline in supported browsers after preparation on HTTPS or localhost.

## Out of scope

Status labels are manual. The app does not send invoices, move money, convert currencies, file taxes, synchronize a team, or provide a public automation API or account system.
