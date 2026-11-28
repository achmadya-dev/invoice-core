import { useState } from 'react'
import { matchesProduct, maxProducts, newProduct, type Product } from './domain/invoice'
import {
  actionsClass,
  buttonClass,
  CurrencySelect,
  dangerTextButtonClass,
  fieldClass,
  fieldsGridClass,
  Icon,
  panelClass,
  primaryButtonClass,
  recordRowBaseClass,
  recordTriggerClass,
  shouldOpenRecordRow,
  WorkspaceDialog,
} from './invoice-ui'
import { LineItems } from './LineItems'

export function ProductsPanel({
  products,
  save,
  remove,
}: {
  products: Product[]
  save: (product: Product) => { ok: true } | { ok: false; message?: string }
  remove: (product: Product) => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [saveAttempted, setSaveAttempted] = useState(false)
  const existing = products.some(({ id }) => id === selected?.id)
  const search = query.trim().toLowerCase()
  const matches = products.filter((product) => matchesProduct(product, search))
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const first = (currentPage - 1) * pageSize
  const visible = matches.slice(first, first + pageSize)
  function openDialog(product: Product | null) {
    setSelected(product)
    setError('')
    setSaveAttempted(false)
  }
  function updateProduct(product: Product) {
    setSelected(product)
    setError('')
  }
  return (
    <section className={panelClass} aria-labelledby="products-title">
      <h2 id="products-title" className="sr-only">
        Products
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ic-line bg-ic-field px-4 py-3.5 max-[480px]:px-3.5">
        <label className={`${fieldClass} flex-[0_1_300px]`}>
          Search products
          <input
            type="search"
            value={query}
            placeholder="Name, description, or currency"
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <button
          className={primaryButtonClass}
          type="button"
          disabled={products.length >= maxProducts}
          onClick={() => openDialog(newProduct('USD'))}
        >
          <Icon name="plus" /> Add product
        </button>
      </div>
      {matches.length > 0 && (
        <p className="px-4 py-2 text-xs text-ic-muted max-[480px]:px-3.5">
          Showing {first + 1}–{first + visible.length} of {matches.length} products
        </p>
      )}
      {matches.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-ic-muted max-[480px]:px-3.5">
          {products.length
            ? 'No products match this search.'
            : 'No products yet. Add a product or service to reuse it on invoices.'}
        </p>
      ) : (
        <ul className="list-none">
          {visible.map((product) => (
            <li
              className={`${recordRowBaseClass} grid-cols-[minmax(0,1fr)_auto]`}
              key={product.id}
              onClick={(event) => {
                if (shouldOpenRecordRow(event)) openDialog(product)
              }}
            >
              <div>
                <h3>
                  <button
                    className={`${recordTriggerClass} font-sans text-sm`}
                    type="button"
                    onClick={() => openDialog(product)}
                  >
                    {product.name}
                  </button>
                </h3>
                <p className="mt-1 font-mono text-xs text-ic-muted">
                  {product.items.length} {product.items.length === 1 ? 'item' : 'items'} ·{' '}
                  {product.currency}
                </p>
              </div>
              <div className={`${actionsClass} cursor-default max-[620px]:col-span-full`}>
                <button
                  className={dangerTextButtonClass}
                  type="button"
                  aria-label={`Delete ${product.name}`}
                  onClick={() => remove(product)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between gap-2.5 border-t border-ic-line bg-ic-field px-4 py-2.5 text-xs text-ic-muted"
          aria-label="Product catalog pages"
        >
          <button
            className={buttonClass}
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span role="status">
            Page {currentPage} of {pageCount}
          </span>
          <button
            className={buttonClass}
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </nav>
      )}
      <WorkspaceDialog
        open={selected !== null}
        title={existing ? 'Edit product' : 'New product'}
        description="Group the items you sell together. Selecting this product on an invoice adds every item below."
        onClose={() => openDialog(null)}
      >
        {selected && (
          <form
            className="mt-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              const result = save(selected)
              if (result.ok) openDialog(null)
              else {
                setSaveAttempted(true)
                setError(
                  result.message ??
                    'Product could not be saved. Check browser storage and try again.',
                )
              }
            }}
          >
            <div className={fieldsGridClass}>
              <label className={fieldClass}>
                Product name
                <input
                  maxLength={120}
                  aria-invalid={saveAttempted && !selected.name.trim() ? true : undefined}
                  placeholder="e.g. Monthly maintenance"
                  value={selected.name}
                  onChange={(event) => updateProduct({ ...selected, name: event.target.value })}
                />
              </label>
              <CurrencySelect
                value={selected.currency}
                onChange={(currency) => updateProduct({ ...selected, currency })}
              />
            </div>
            <fieldset className="mt-4 min-w-0 border-t border-ic-line px-0 pt-2.5 pb-0">
              <legend className="pr-2 font-bold">Items</legend>
              <LineItems
                items={selected.items}
                edit={(update) => updateProduct({ ...selected, items: update(selected.items) })}
                currency={selected.currency}
                caption="Product line items"
                empty="Add at least one item to save this product."
                showErrors={saveAttempted}
              />
            </fieldset>
            {error && (
              <p className="ic-error mt-2 text-ic-error" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button className={buttonClass} type="button" onClick={() => openDialog(null)}>
                Cancel
              </button>
              <button className={primaryButtonClass} type="submit">
                Save product
              </button>
            </div>
          </form>
        )}
      </WorkspaceDialog>
    </section>
  )
}
