# Implementation procedure

1. Read the accepted task, `AGENTS.md`, `docs/CODE_STANDARDS.md`, affected product/domain context, and the closest existing implementation. Use `docs/PATTERNS.md` before inventing a new pattern.
2. Check repository status, preserve unrelated edits, and create/use the task branch.
3. Implement the smallest coherent vertical slice that satisfies the acceptance criteria. Keep domain, persistence, transport, and UI responsibilities inside their documented boundaries.
4. Validate untrusted input at the owning boundary, enforce policy before protected side effects, and represent expected business failures explicitly. Server endpoints must validate inputs on the server.
5. Add tests at the cheapest layer that proves the behavior, including meaningful failure/boundary cases. Do not weaken existing tests or checks to obtain a green local result.
6. Run the relevant verification commands. At minimum for code changes run `bun run check`; run `bun run verify` for changes to the invoice workflow, runtime, or offline behavior.
7. Review the complete diff against the required self-review checklist in `docs/CODE_STANDARDS.md`. Fix violations before reporting completion; record any intentional exception with its reason.
8. Record actual outcomes, update docs/ADR/runbook and handoff where the contract changed, and create/update the PR with true issue links and evidence when access exists.

For incomplete external access, leave the local evidence and name the blocked external step. Never report unrun checks, unpublished issues, or unverified behavior as complete. Do not merge or deploy without authorization.
