# Historical SQL migrations

Invoice Core is browser-local and has no application database or migration runner. The SQL files in `sqlite/`, `postgres/`, and `mysql/` are retained unchanged to preserve the checksums and recovery history of the retired account infrastructure. Do not apply them to a new workspace.

Any previously created tables, databases, or volumes remain untouched. Review the [recovery runbook](../../docs/runbooks/RECOVERY.md) before handling legacy data.
