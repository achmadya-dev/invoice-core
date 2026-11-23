# Invoice Core design

**Dispatch Desk** is an operational workspace: fill in the left-hand editor and check the white document proof to its right. At 900px and below, switch between Edit and Preview; keep the same draft and document model in both views.

## Visual system

- Deep indigo (`#282049`) frames navigation and the proof. Working actions use indigo (`#4837a6`), the desk uses lavender (`#e8e5f4`), and yellow (`#f9e080`) marks the brand and amount due. Dark theme adjusts the desk and editor but preserves the white print proof.
- Bricolage Grotesque gives headings and the wordmark their shape; system sans keeps form labels and inputs familiar; tabular and monospace figures distinguish amounts and record references.
- The amount slip is the strongest mark inside the invoice. Screen-only controls stay outside the document. PDF uses the same document data and calculation as preview, with a paginated A4 layout.
- The header theme control uses a Base UI Select showing the active mode with a short label, icon, theme-aware popup menu, and visible keyboard focus.
- Editor document actions stay in one header row (`New invoice`, `Save invoice`, `Download PDF`); contextual `Load example` sits in the editor panel bar while `Print` and desktop `Expand` / `Split view` live in the preview panel bar.
- Use Base UI Select controls for labeled form choices and a searchable country combobox. Keep editable invoice lines in a semantic table that fits narrow screens; dates and numeric entries remain native inputs.
- The brand mark is original. [Bricolage Grotesque](../public/licenses/OFL-Bricolage-Grotesque.txt) and [Noto Sans](../public/licenses/OFL-Noto-Sans.txt) ship under the SIL Open Font License. No source code or visual assets from Gogo Invoice are copied.

## Usage

Use visible field labels, an obvious keyboard focus indicator, and explicit feedback for invalid values, unsaved changes, and storage failures. Require a confirmation when replacing data. Screens show working data by default; Load example inserts clearly identified synthetic details.
