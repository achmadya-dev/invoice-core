# Product context

Invoice Core is a browser-local invoice editor for freelancers, independent studios, and small teams whose invoicing work stays on one device.

## Main workflow

**Invoices** is the landing list. Search or filter saved invoices by company. The list is paginated and sorts by newest issue date first. Download PDFs, click a row or **Edit** to reopen an invoice in the detail modal, duplicate, or delete records. **Create invoice** opens a fresh sheet in a modal with an automatically filled invoice number and the browser's local date. Both are editable. A new manual invoice has no due date until entered. Duplicating opens a new sheet in the modal populated from the source invoice with a new number. Open a saved invoice and use **Save changes** to update it. Unsaved changes are kept only while the modal is open; closing it or reloading discards them.

Click or tab into the text on the invoice sheet to edit it directly. Example text is a hint, not invoice content. Upload or replace the invoice logo from the sheet header. The separate **Invoice options** area holds company, currency, and country settings; it also lets you copy a saved client or add an entire product group in the invoice currency. Edit **Notes**, **Terms**, and **Payment details** at the bottom of the sheet. Switch between **Invoices**, **Products**, and **Companies** tabs on the main page, using dialogs to add or edit products and company defaults. From **Backup**, export saved records, restore a validated backup, or confirm clearing the workspace.

Switch to **Preview** for a read-only document and back to **Edit** without losing inputs. Only one sheet is visible at a time. You can download the A4 PDF from either mode, even when the draft is incomplete; this does not save the invoice. The editor, preview, and PDF use the same invoice values and money formatting.

## Data and access

No login is required. Invoice data, products, company profiles, logos, and theme are stored in the browser profile for the current origin. They are not encrypted by the app or synchronized. Use a dedicated browser profile on a shared device and edit the workspace in one tab at a time. Export a private JSON backup before clearing site data, moving origins, or replacing the workspace. Restore accepts Invoice Core backups only.

The built workspace can be installed and reopened offline in supported browsers after preparation on HTTPS or localhost.

## Out of scope

The app does not track payment or sending status, send invoices, move money, convert currencies, file taxes, synchronize a team, or provide a public automation API or account system.
