# Product context

Invoice Core is a browser-local invoice editor for freelancers, independent studios, and small teams whose invoicing work stays on one device.

## Main workflow

**Invoices** is the landing list. Search or filter saved invoices by company. The list is paginated and sorts by newest issue date first. Download PDFs, reopen, duplicate, or delete records. **Create invoice** always opens a fresh form with a suggested number. Duplicating opens a new form populated from the source invoice with a new number. Open a saved invoice and use **Save changes** to update it. Unsaved changes are kept only while the editor is open; leaving it or reloading discards them.

Edit directly on the invoice sheet. Use **Company** near the header to copy sender defaults, and **Add product** next to the item table to insert an entire group in the invoice currency. The **Client** field searches prior invoices or accepts a new name inline. Edit **Notes**, **Terms**, and **Payment details** at the bottom of the sheet. **Catalog** includes searchable **Products** and **Companies** panels with dialogs for editing. From **Invoices → Backup**, change theme, export saved records, restore a validated backup, or confirm clearing the workspace.

Switch to **Preview** for a read-only document and back to **Edit** without losing inputs. Only one sheet is visible at a time. You can download the A4 PDF from either mode, even when the draft is incomplete; this does not save the invoice. The editor, preview, and PDF use the same invoice values and money formatting.

## Data and access

No login is required. Invoice data, products, company profiles, logos, and theme are stored in the browser profile for the current origin. They are not encrypted by the app or synchronized. Use a dedicated browser profile on a shared device and edit the workspace in one tab at a time. Export a private JSON backup before clearing site data, moving origins, or replacing the workspace. Restore accepts Invoice Core backups only.

The built workspace can be installed and reopened offline in supported browsers after preparation on HTTPS or localhost.

## Out of scope

The app does not track payment or sending status, send invoices, move money, convert currencies, file taxes, synchronize a team, or provide a public automation API or account system.
