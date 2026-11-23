import { useState } from 'react'
import { maxProducts, newProduct, type Currency, type Product, type Theme } from './domain/invoice'
import { CurrencySelect, DecimalField, Icon, WorkspaceDialog } from './invoice-ui'

export function ProductsPanel({
  products,
  defaultCurrency,
  theme,
  save,
  remove,
}: {
  products: Product[]
  defaultCurrency: Currency
  theme: Theme
  save: (product: Product) => { ok: true } | { ok: false; message?: string }
  remove: (product: Product) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const existing = products.some(({ id }) => id === selected?.id)
  const search = query.trim().toLowerCase()
  const matches = products.filter(({ name, description, currency }) =>
    [name, description, currency].some((value) => value.toLowerCase().includes(search)),
  )
  function edit(product: Product | null) {
    setSelected(product)
    setError('')
  }
  return (
    <section className="ic-editor ic-panel ic-master-panel" aria-labelledby="products-title">
      <div className="ic-panel-bar">
        <h2 id="products-title">Products</h2>
      </div>
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
          onClick={() => edit(newProduct(defaultCurrency))}
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
                  {product.description} · {product.rate || '0'} {product.currency}
                </p>
              </div>
              <div className="ic-actions">
                <button
                  className="ic-button"
                  type="button"
                  aria-label={`Edit ${product.name}`}
                  onClick={() => edit(product)}
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
        description="These defaults are copied into a new invoice line when you pick this product."
        theme={theme}
        onClose={() => edit(null)}
      >
        {selected && (
          <form
            className="ic-dialog-body"
            onSubmit={(event) => {
              event.preventDefault()
              const result = save(selected)
              if (result.ok) edit(null)
              else
                setError(
                  result.message ??
                    'Product could not be saved. Check browser storage and try again.',
                )
            }}
          >
            <div className="ic-fields">
              <label className="ic-field ic-span">
                Product name
                <input
                  maxLength={120}
                  value={selected.name}
                  onChange={(event) => edit({ ...selected, name: event.target.value })}
                  required
                />
              </label>
              <label className="ic-field ic-span">
                Invoice line description
                <textarea
                  maxLength={240}
                  rows={2}
                  value={selected.description}
                  onChange={(event) => edit({ ...selected, description: event.target.value })}
                  required
                />
              </label>
              <CurrencySelect
                label="Product currency"
                value={selected.currency}
                onChange={(currency) => edit({ ...selected, currency })}
              />
              <DecimalField
                label="Default quantity"
                kind="quantity"
                value={selected.quantity}
                onChange={(quantity) => edit({ ...selected, quantity })}
              />
              <DecimalField
                label="Default rate"
                kind="amount"
                value={selected.rate}
                onChange={(rate) => edit({ ...selected, rate })}
              />
            </div>
            {error && (
              <p className="ic-error ic-note" role="alert">
                {error}
              </p>
            )}
            <div className="ic-modal-actions">
              <button className="ic-button" type="button" onClick={() => edit(null)}>
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
