# Invoice Core design

**Dispatch Desk** is an operational workspace: fill in the left-hand editor and check the white document proof to its right. At 900px and below, switch between Edit and Preview; keep the same draft and document model in both views.

## Visual system

- Deep indigo (`#282049`) frames navigation and the proof. Working actions use indigo (`#4837a6`), the desk uses lavender (`#e8e5f4`), and yellow (`#f9e080`) marks the brand and amount due. Dark theme adjusts the desk and editor but preserves the white print proof.
- Bricolage Grotesque gives headings and the wordmark their shape; system sans keeps form labels and inputs familiar; tabular and monospace figures distinguish amounts and record references.
- The amount slip is the strongest mark inside the invoice. Screen-only controls stay outside the document. PDF uses the same document data and calculation as preview, with a paginated A4 layout.
- Use a compact, balanced navigation for Invoices and Catalog. In Catalog, Products sits to the left of Companies; both use the same searchable layout and stack on narrow screens. The theme setting lives in the Backup dialog.
- Invoices opens on the paginated history with `Create invoice` and `Backup`. In the editor, Back sits above the form on the left; Create or Save and Reset sit under the form. Download PDF sits under the document preview. Invoice details and Line items are collapsible and start open. The white proof uses a small gutter and a shadow for separation.
- Group company, currency, number, dates, and client under Invoice details, with separate sender and billing disclosures. Keep Add product above the invoice line table and reuse the same line table for a product's included items. Use labeled Base UI controls and keep dropdown triggers stable. Manage products, companies, and backups in dialogs.
- The brand mark is original. [Bricolage Grotesque](../public/licenses/OFL-Bricolage-Grotesque.txt) and [Noto Sans](../public/licenses/OFL-Noto-Sans.txt) ship under the SIL Open Font License. No source code or visual assets from Gogo Invoice are copied.

## Usage

Use visible field labels, an obvious keyboard focus indicator, and explicit feedback for invalid values, unsaved changes, and storage failures. Require a confirmation when replacing data. Screens show working data by default; Load example inserts clearly identified synthetic details.
