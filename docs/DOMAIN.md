# Domain and invariants

## Invoices

- A **sender profile** holds reusable business details, logo, defaults, and numbering series. An **invoice** stores its own sender snapshot. Editing or deleting a profile does not change existing invoices.
- A **working draft** is the one editable copy in each browser workspace. Saving to **history** requires sender and recipient names, an invoice number, an issue date, and at least one described line. A provided due date cannot precede the issue date. Draft, sent, and paid are manual labels, not workflow events.
- Invoice numbers are unique within a sender profile, ignoring case and surrounding spaces. Saving a new invoice with its suggested number advances the profile series; a custom number does not. The next suggestion skips numbers already in use. Duplicating creates new identity and line IDs, resets dates and status, and leaves the original alone.
- A line quantity may be negative for a credit adjustment. Rates, shipping, and discounts cannot be negative. Empty numeric fields count as zero, with a maximum of nine whole digits and three decimal digits in a numeric entry. Percentage discount and tax accept 0–100%.
- Calculate and round each line to the currency's minor-unit precision, half away from zero. Apply one fixed or percentage discount to a positive subtotal, no greater than that subtotal. Apply tax to the post-discount amount, then add shipping. A nonpositive subtotal does not receive a discount. Switching currencies changes units and rounding, not numeric inputs or exchange rates.
- Example: USD lines of `1.005` and `2.005` become `$1.01` and `$2.01`. With a 10% discount, 25% tax, and `$0.35` shipping, the total is `$3.75`. Preview and PDF use the same calculation; PDF uses currency codes.

## Undecided

Tenant isolation, tax compliance rules, accounting ledgers, approvals, and business audit rules are not implemented. Configure taxes according to the applicable rules; the invoice calculator does not determine what tax to collect.

When adding a domain, record its terms, invariants, valid and invalid examples, exceptions, and the acceptance criteria or tests that prove them.
