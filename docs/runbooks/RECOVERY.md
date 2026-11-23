# Invoice Core recovery

## Browser-local data

Before an origin change, rollback, or clearing browser data, use **Backup → Download backup** from the browser profile that holds the invoices. Backups may include contact and payment details; keep them private. Restore replaces the workspace only after validation and confirmation.

- If stored JSON cannot be read, use **Download unreadable data** before restoring a known-good backup.
- If another tab changed the workspace, export the stale tab's draft before reloading.
- For an origin change, confirm the new URL, restore the backup in the intended profile, and check a representative invoice, company, and history record.

## Application rollback

Keep the previous immutable build. Verify it against a disposable browser profile and synthetic backup before using it for recovery. Reverting code does not roll back browser data. If an older offline shell interferes, unregister the Invoice Core worker and delete only its `invoice-core-shell-*` **Cache Storage** entries. Do not clear Local Storage. Verify the online revision before reopening the editor.

## Retired database

The current app cannot connect to or migrate the old database. Existing tables, files, and volumes remain untouched. The original SQL is preserved in [the migration archive](../../db/migrations/README.md). If old account data requires recovery or disposal, first verify the target and approve a separate plan and backup. Do not run the archived SQL or remove Docker volumes as part of an application rollback.

## Release readiness

Record the deployment target and owner, and verify HTTPS, offline reopening, and backup restoration with synthetic data. Payments and invoice delivery are not provided by this application.
