# Invoice Core design

**Dispatch Desk** is an operational workspace centered on a single invoice sheet. Edit the document in place or switch to a clean read-only preview. Both modes share the same draft and document model.

## Visual system

- Deep indigo (`#282049`) frames navigation and the proof. Working actions use indigo (`#4837a6`), the desk uses lavender (`#e8e5f4`), and yellow (`#f9e080`) marks the brand and amount due. Dark theme (following system color scheme by default or toggled from the topbar **Dark mode** switch) adjusts the desk, modals, and workspace while preserving the white print proof.
- Bricolage Grotesque gives headings and the wordmark their shape; system sans keeps form labels and inputs familiar; tabular and monospace figures distinguish amounts and record references.
- The amount slip is the strongest mark inside the invoice. Editing controls never appear in the read-only or printed document. PDF uses the same document data and calculation as preview, with a paginated A4 layout.
- Present **Invoices**, **Products**, and **Companies** as three tabs on a single page, without a separate topbar switcher, keeping the same searchable list layout across Products and Companies.
- Invoices opens on the paginated history with **Backup** and **Create invoice** in the header. Clicking **Create invoice**, **Duplicate**, or a saved row opens the invoice sheet in a wide modal with **Edit / Preview**, **Accent color**, and **Layout** controls in the modal header, a light options strip above the framed white sheet, and primary actions below it. Download PDF is available in both Edit and Preview modes. The white sheet uses a small gutter and a shadow for separation.
- Keep Company, Currency, country, discount-type, Accent color, and Layout controls in the separate options area and modal header above the sheet, placing compact **Use saved client** and **Add product** modal-trigger buttons beside **Bill to** and **Line items**. Upload or replace the logo in the sheet header. Show entered values and examples as editable document text on the paper, without persistent input borders. Show computed line amounts in the editable table and give each item description a full row on narrow screens. Place Notes and Terms side by side above full-width Payment details, stacking at narrow widths. Use labeled Base UI controls and keep dropdown triggers stable. Manage products, companies, and backups in dialogs.
- The brand mark is original. [Bricolage Grotesque](../public/licenses/OFL-Bricolage-Grotesque.txt) and [Noto Sans](../public/licenses/OFL-Noto-Sans.txt) ship under the SIL Open Font License.

## Usage

Use visible labels or document headings and examples, descriptive accessible field names, an obvious keyboard focus indicator, and explicit feedback for invalid values and storage failures. Require a confirmation when replacing stored data. Blank fields show examples that are never stored or exported.
