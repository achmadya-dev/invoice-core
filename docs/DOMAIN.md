# Domain and invariants

## Invoices

- A **sender profile** holds reusable business details, logo, defaults, and numbering series. An **invoice** stores its own sender snapshot. Editing or deleting a profile does not change existing invoices.
- A **working draft** is the one editable copy in each browser workspace. Saving to **history** requires sender and recipient names, an invoice number, an issue date, and at least one described line. A provided due date cannot precede the issue date. Downloading the current preview does not save a record and is allowed before those fields are filled. Legacy status values are kept in storage and backups but are not exposed as an invoice workflow.
- Invoice numbers are unique within a sender profile, or within the same sender name for manual invoices, ignoring case and surrounding spaces. Suggestions use the profile series or the first available `INV-` number for a manual sender. Before a manual sender is identified, the suggestion skips numbers used by any manual sender. Saving a new invoice with the suggested profile number advances the profile series; a custom number does not. Duplicating creates new identity, number, and line IDs, resets dates, and leaves the original alone. The copy is not a saved invoice until explicitly created.
- A line quantity may be negative for a credit adjustment. Rates, shipping, and discounts cannot be negative. Empty numeric fields count as zero, with a maximum of nine whole digits and three decimal digits in a numeric entry. Percentage discount and tax accept 0–100%.
- A **product** is a reusable source for one invoice line, with a name, description, currency, and default quantity and rate. Selecting it adds a copy with a new line ID, requires matching currency, and leaves existing lines and other invoice fields unchanged. Later catalog changes do not affect the copy. Applying a company to a new draft fills sender defaults without changing the currency of already-entered rates or amount adjustments.
- A **client** is an invoice's billing contact snapshot, not a separate master record. Reusing a contact copies details from a saved invoice. Entering a different client name manually does not carry the old client's contact information into the new one.
- Calculate and round each line to the currency's minor-unit precision, half away from zero. Apply one fixed or percentage discount to a positive subtotal, no greater than that subtotal. Apply tax to the post-discount amount, then add shipping. A nonpositive subtotal does not receive a discount. Switching currencies changes units and rounding, not numeric inputs or exchange rates.
- Example: USD lines of `1.005` and `2.005` become `$1.01` and `$2.01`. With a 10% discount, 25% tax, and `$0.35` shipping, the total is `$3.75`. Preview and PDF share the calculation and formatted amounts and display the ISO currency code alongside the total.

## Undecided

Tenant isolation, tax compliance rules, accounting ledgers, approvals, and business audit rules are not implemented. Configure taxes according to the applicable rules; the invoice calculator does not determine what tax to collect.

When adding a domain, record its terms, invariants, valid and invalid examples, exceptions, and the acceptance criteria or tests that prove them.
