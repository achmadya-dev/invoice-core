# Invoice Core recovery

## Browser-local data

Before an origin change, rollback, or clearing browser data, use **Invoices → Backup → Download backup** from the browser profile that holds the invoices. Backups may include contact and payment details; keep them private. Restore replaces the workspace only after validation and confirmation.

- If stored JSON cannot be read, use **Download unreadable data** before restoring a known-good backup.
- If another tab changed the workspace, finish or export the editor preview if needed before reloading. Unsaved form changes are not part of a JSON backup.
- For an origin change, confirm the new URL, restore the backup in the intended profile, and check a representative invoice, company, and history record.

## Application rollback

Keep the previous immutable build. Verify it against a disposable browser profile and synthetic backup before using it for recovery. Reverting code does not roll back browser data. If an older offline shell interferes, unregister the Invoice Core worker and delete only its `invoice-core-shell-*` **Cache Storage** entries. Do not clear Local Storage. Verify the online revision before reopening the editor.

Workspace format v4 keeps the existing browser storage key. V1 backups open with an empty catalog, v2 bundles remain grouped, and each v3 product becomes a one-item group. A v3 backup that already split an older bundle does not contain enough information to regroup it. Saved invoices, companies, and theme are preserved. Old unsaved drafts are intentionally omitted; save any unfinished invoice you want to keep or export a private backup from the older app before upgrading. Simply opening an older workspace does not change the stored JSON until a workspace change is saved.

Older builds cannot read v4. Keep a current private v4 backup before rolling back and verify any older build with a compatible backup in a disposable profile. To recover current v4 data, reopen a v4-compatible build rather than clearing storage or replacing it with an older backup.

## Retired database

The current app cannot connect to or migrate any external database. Inherited template SQL migration files were removed from the working tree in PR #27 and remain only in earlier Git history. If legacy external data requires recovery or disposal, first verify the target and approve a separate plan and backup. Do not run historical SQL or remove Docker volumes as part of an application rollback.

## Release readiness

Record the deployment target and owner, and verify HTTPS, offline reopening, and backup restoration with synthetic data. Payments and invoice delivery are not provided by this application.
