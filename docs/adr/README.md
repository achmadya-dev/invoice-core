# Architecture decision records

ADRs explain **why a durable design choice was made**, the alternatives rejected, and the consequences. Current operational instructions live in `docs/ARCHITECTURE.md`, `docs/CODE_STANDARDS.md`, and runbooks; ADRs are not substitutes for those documents.

- [ADR 0003 — Browser-local invoice workspace](0003-browser-local-invoice-workspace.md): current decision.

Use [`0000-template.md`](0000-template.md) only for a decision that crosses modules, changes a durable contract, or is expensive to reverse. Use the next number, date the decision, link a real issue if one exists, and record context, decision, alternatives, consequences, and how to evaluate it. Keep accepted and superseded ADRs in Git to preserve reasoning. When replacing only part of a decision, say exactly which part and link both records; update current architecture/runbook guidance as needed. Routine task status, command logs, and PR evidence belong in issues and PRs, not in ADRs.
