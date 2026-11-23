import { useId, type ReactNode } from 'react'
import { decimalValid, maxItems, newItem, type Currency, type LineItem } from './domain/invoice'
import { Icon } from './invoice-ui'

export function LineItems({
  items,
  edit,
  currency,
  caption,
  empty,
  children,
}: {
  items: LineItem[]
  edit: (update: (items: LineItem[]) => LineItem[]) => void
  currency: Currency
  caption: string
  empty: string
  children?: ReactNode
}) {
  const id = useId()
  const addButtonId = `${id}-add-line`
  const helpId = `${id}-amount-help`
  const descriptionId = (itemId: string) => `${id}-description-${itemId}`
  const focus = (target: string) =>
    requestAnimationFrame(() => document.getElementById(target)?.focus())

  function update(itemId: string, key: 'description' | 'quantity' | 'rate', value: string) {
    edit((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    )
  }

  return (
    <>
      <div className="ic-items">
        {items.length === 0 ? (
          <p className="ic-muted">{empty}</p>
        ) : (
          <table className="ic-item-table">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col">Qty</th>
                <th scope="col">Rate</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <input
                      id={descriptionId(item.id)}
                      aria-label={`Description, item ${index + 1}`}
                      maxLength={240}
                      placeholder="Service or product"
                      value={item.description}
                      onChange={(event) => update(item.id, 'description', event.target.value)}
                    />
                  </td>
                  {(['quantity', 'rate'] as const).map((key) => (
                    <td key={key}>
                      <input
                        aria-label={`${key === 'quantity' ? 'Quantity' : 'Rate'}, item ${index + 1}`}
                        aria-invalid={
                          !decimalValid(item[key], key === 'quantity' ? 'quantity' : 'amount')
                        }
                        aria-describedby={helpId}
                        inputMode="decimal"
                        maxLength={16}
                        placeholder="0"
                        value={item[key]}
                        onChange={(event) => update(item.id, key, event.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      className="ic-icon-button"
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => {
                        const next = items[index + 1] ?? items[index - 1]
                        edit((current) => current.filter((line) => line.id !== item.id))
                        focus(next ? descriptionId(next.id) : addButtonId)
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="ic-actions ic-line-controls">
        <button
          id={addButtonId}
          className="ic-button"
          type="button"
          disabled={items.length >= maxItems}
          onClick={() => {
            const item = newItem()
            edit((current) => [...current, item])
            focus(descriptionId(item.id))
          }}
        >
          <Icon name="plus" /> Add line item
        </button>
        {children}
      </div>
      <p id={helpId} className="ic-muted ic-note">
        Use up to three decimal places. Rates use {currency}.
      </p>
    </>
  )
}
