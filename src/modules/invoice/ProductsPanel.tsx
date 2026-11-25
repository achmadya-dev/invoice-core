import { useState } from 'react'
import { matchesProduct, maxProducts, newProduct, type Product, type Theme } from './domain/invoice'
import { CurrencySelect, Icon, WorkspaceDialog } from './invoice-ui'
import { LineItems } from './LineItems'

export function ProductsPanel({
  products,
  theme,
  save,
  remove,
}: {
  products: Product[]
  theme: Theme
  save: (product: Product) => { ok: true } | { ok: false; message?: string }
  remove: (product: Product) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [saveAttempted, setSaveAttempted] = useState(false)
  const existing = products.some(({ id }) => id === selected?.id)
  const search = query.trim().toLowerCase()
  const matches = products.filter((product) => matchesProduct(product, search))
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
    <section className="ic-editor ic-master-panel" aria-labelledby="products-title">
      <h2 id="products-title" className="sr-only">
        Products
      </h2>
      <div className="ic-master-toolbar ic-panel-pad">
        <label className="ic-field">
          Search products
          <input
            type="search"
            value={query}
            placeholder="Name, description, or currency"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className="ic-button ic-primary"
          type="button"
          disabled={products.length >= maxProducts}
          onClick={() => openDialog(newProduct('USD'))}
        >
          <Icon name="plus" /> Add product
        </button>
      </div>
      {matches.length === 0 ? (
        <p className="ic-empty">
          {products.length
            ? 'No products match this search.'
            : 'No products yet. Add a product or service to reuse it on invoices.'}
        </p>
      ) : (
        <ul className="ic-records">
          {matches.map((product) => (
            <li className="ic-record" key={product.id}>
              <div>
                <h3>{product.name}</h3>
                <p>
                  {product.items.length} {product.items.length === 1 ? 'item' : 'items'} ·{' '}
                  {product.currency}
                </p>
              </div>
              <div className="ic-actions">
                <button
                  className="ic-button"
                  type="button"
                  aria-label={`Edit ${product.name}`}
                  onClick={() => openDialog(product)}
                >
                  Edit
                </button>
                <button
                  className="ic-text-button"
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
      <WorkspaceDialog
        open={selected !== null}
        title={existing ? 'Edit product' : 'New product'}
        description="Group the items you sell together. Selecting this product on an invoice adds every item below."
        theme={theme}
        onClose={() => openDialog(null)}
      >
        {selected && (
          <form
            className="ic-dialog-body"
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
            <div className="ic-fields">
              <label className="ic-field">
                Product name
                <input
                  maxLength={120}
                  aria-invalid={saveAttempted && !selected.name.trim() ? true : undefined}
                  value={selected.name}
                  onChange={(event) => updateProduct({ ...selected, name: event.target.value })}
                  required
                />
              </label>
              <CurrencySelect
                label="Product currency"
                value={selected.currency}
                onChange={(currency) => updateProduct({ ...selected, currency })}
              />
            </div>
            <fieldset className="ic-bundle-items">
              <legend>Included items</legend>
              <LineItems
                items={selected.items}
                edit={(update) => {
                  setSelected((current) =>
                    current ? { ...current, items: update(current.items) } : current,
                  )
                  setError('')
                }}
                currency={selected.currency}
                caption="Product line items"
                empty="Add at least one item to this product."
                showErrors={saveAttempted}
              />
            </fieldset>
            {error && (
              <p className="ic-error ic-note" role="alert">
                {error}
              </p>
            )}
            <div className="ic-modal-actions">
              <button className="ic-button" type="button" onClick={() => openDialog(null)}>
                Cancel
              </button>
              <button className="ic-button ic-primary" type="submit">
                Save product
              </button>
            </div>
          </form>
        )}
      </WorkspaceDialog>
    </section>
  )
}
