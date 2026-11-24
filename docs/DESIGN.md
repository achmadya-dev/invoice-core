# Invoice Core design

**Dispatch Desk** is an operational workspace centered on a single invoice sheet. Edit the document in place or switch to a clean read-only preview. Both modes share the same draft and document model.

## Visual system

- Deep indigo (`#282049`) frames navigation and the proof. Working actions use indigo (`#4837a6`), the desk uses lavender (`#e8e5f4`), and yellow (`#f9e080`) marks the brand and amount due. Dark theme adjusts the desk and editor but preserves the white print proof.
- Bricolage Grotesque gives headings and the wordmark their shape; system sans keeps form labels and inputs familiar; tabular and monospace figures distinguish amounts and record references.
- The amount slip is the strongest mark inside the invoice. Editing controls never appear in the read-only or printed document. PDF uses the same document data and calculation as preview, with a paginated A4 layout.
- Use a compact, balanced navigation for Invoices and Catalog. In Catalog, Products sits to the left of Companies; both use the same searchable layout and stack on narrow screens. The theme setting lives in the Backup dialog.
- Invoices opens on the paginated history with `Create invoice` and `Backup`. In the editor, Back sits above the sheet; Create or Save and Reset sit below it. Download PDF is available in both modes. The white sheet uses a small gutter and a shadow for separation.
- Keep Company, Currency, saved-client and product controls in a separate options area above the sheet. Upload or replace the logo in the sheet header. Show entered values and examples as editable document text on the paper, without persistent input borders. Show computed line amounts in the editable table and give each item description a full row on narrow screens. Place Notes and Terms side by side above full-width Payment details, stacking at narrow widths. Use labeled Base UI controls and keep dropdown triggers stable. Manage products, companies, and backups in dialogs.
- The brand mark is original. [Bricolage Grotesque](../public/licenses/OFL-Bricolage-Grotesque.txt) and [Noto Sans](../public/licenses/OFL-Noto-Sans.txt) ship under the SIL Open Font License. No source code or visual assets from Gogo Invoice are copied.

## Usage

Use visible labels or document headings and examples, descriptive accessible field names, an obvious keyboard focus indicator, and explicit feedback for invalid values and storage failures. Require a confirmation when replacing stored data. Blank fields show examples that are never stored or exported; Load example explicitly inserts synthetic details.
