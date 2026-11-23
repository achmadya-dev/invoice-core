# Implementation patterns

Follow [the code standards](CODE_STANDARDS.md). Reuse the nearest invoice implementation unless it conflicts with a documented rule.

## Develop a feature in its slice

Keep invoice rules and validation in `src/modules/invoice/domain/`. Let React components manage interaction and update the draft immutably; keep browser reads and writes in `workspace.browser.ts`. Routes should compose features, not define how invoices calculate or persist.

## Validate at the browser storage boundary

The active draft may contain incomplete inputs. Moving a draft into history validates the invoice before committing it. Loading an existing workspace or restoring a backup validates the whole versioned payload; parsing errors leave the original data alone. Keep the schema and backup version compatible or document and test an explicit migration.

## Preserve a single document model

Use the exact decimal calculation in `domain/invoice.ts` for any money display. `document.ts` prepares the document consumed by both the preview and PDF. Do not round or recompute totals inside a UI component or PDF renderer.

## Place tests at the boundary they prove

- Use unit tests for domain calculations, numbering, and backup parsing.
- Use Playwright for the editor flow, backup/restore interaction, accessibility, responsive behavior, and offline access.
- Use the production smoke test for the served shell, manifest link, and route status codes.

Add a new infrastructure layer only when a real feature needs it; do not add a backend or integrations as preparation for possible future work.
