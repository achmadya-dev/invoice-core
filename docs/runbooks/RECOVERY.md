# Invoice Core recovery

## Browser-local data

Before an origin change, rollback, or clearing browser data, use **Invoices → Backup → Download backup** from the browser profile that holds the invoices. Backups may include contact and payment details; keep them private. Restore replaces the workspace only after validation and confirmation.

- If stored JSON cannot be read, use **Download unreadable data** before restoring a known-good backup.
- If another tab changed the workspace, export the stale tab's draft before reloading.
- For an origin change, confirm the new URL, restore the backup in the intended profile, and check a representative invoice, company, and history record.

## Application rollback

Keep the previous immutable build. Verify it against a disposable browser profile and synthetic backup before using it for recovery. Reverting code does not roll back browser data. If an older offline shell interferes, unregister the Invoice Core worker and delete only its `invoice-core-shell-*` **Cache Storage** entries. Do not clear Local Storage. Verify the online revision before reopening the editor.

Workspace format v3 adds a product catalog and keeps the existing browser storage key. V1 backups open with an empty catalog. In v2 test workspaces and backups, each custom bundle line becomes one product with its original description, quantity, rate, and currency. Single-line bundles retain their name; multi-line bundles are split and use their individual line descriptions as product names. Invoice drafts, history, and companies are not rewritten by migration. Simply opening an older workspace does not change the stored JSON until a workspace change is saved.

Older builds cannot read v3. Keep a current private v3 backup before rolling back and verify any older build with a compatible backup in a disposable profile. To recover current v3 data, reopen a v3-compatible build rather than clearing storage or replacing it with an older backup.

## Retired database

The current app cannot connect to or migrate the old database. Existing tables, files, and volumes remain untouched. The original SQL is preserved in [the migration archive](../../db/migrations/README.md). If old account data requires recovery or disposal, first verify the target and approve a separate plan and backup. Do not run the archived SQL or remove Docker volumes as part of an application rollback.

## Release readiness

Record the deployment target and owner, and verify HTTPS, offline reopening, and backup restoration with synthetic data. Payments and invoice delivery are not provided by this application.
