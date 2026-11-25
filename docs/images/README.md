# Maintained visual assets

These screenshots illustrate the live Invoice Core interface in [`README.md`](../../README.md).

## Source

- Captured from a local production build (`bun run build`) using Playwright Chromium with `document.fonts.ready` settled.
- Seeded exclusively with the synthetic workspace in [`docs/examples/sample-workspace.v4.json`](../examples/sample-workspace.v4.json) (no private or production data).

| File | View & state | Viewport | Color scheme |
| --- | --- | --- | --- |
| [`invoice-editor.png`](invoice-editor.png) | Direct on-sheet editor (`INV-0042`, Classic layout) | `1280×1010` | Light |
| [`invoice-preview-modern.png`](invoice-preview-modern.png) | Read-only A4 Preview (`INV-0043`, Modern emerald layout) | `1280×900` | Light |
| [`workspace-invoices.png`](workspace-invoices.png) | Invoices tab with searchable history | `1280×820` | Light |
| [`catalog-products-dark.png`](catalog-products-dark.png) | Products catalog tab with multi-line bundles | `1280×640` | Dark (`prefers-color-scheme: dark`) |
| [`mobile-workspace.png`](mobile-workspace.png) | Responsive mobile Invoices workspace | `390×844` | Light |

## Update policy

Recapture the affected screenshot(s) against the production build using `docs/examples/sample-workspace.v4.json` whenever the invoice sheet layout, workspace navigation, visual system tokens, or responsive breakpoints change meaningfully.
