import { useId } from 'react'
import { decimalValid, maxItems, newItem, type Currency, type LineItem } from './domain/invoice'
import { actionsClass, buttonClass, Icon, iconButtonClass } from './invoice-ui'

const mobileLabelClass = 'hidden pb-[3px] text-[11px] font-semibold text-ic-muted max-[480px]:block'
const compactActionClass =
  'grid size-8 flex-none place-items-center rounded-md border border-transparent bg-transparent p-0 text-ic-muted transition-[background-color,border-color,color] duration-120 hover:border-ic-line hover:bg-ic-soft hover:text-ic-ink motion-reduce:transition-none'

export function LineItems({
  items,
  edit,
  currency,
  caption,
  empty,
  amounts,
  showErrors = false,
}: {
  items: LineItem[]
  edit: (update: (items: LineItem[]) => LineItem[]) => void
  currency: Currency
  caption: string
  empty: string
  amounts?: readonly string[]
  showErrors?: boolean
}) {
  const id = useId()
  const addButtonId = `${id}-add-line`
  const helpId = `${id}-amount-help`
  const descriptionId = (itemId: string) => `${id}-description-${itemId}`
  const focus = (target: string) =>
    requestAnimationFrame(() => document.getElementById(target)?.focus())
  const reorderable = items.length > 1

  function update(itemId: string, key: 'description' | 'quantity' | 'rate', value: string) {
    edit((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    )
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    edit((current) => {
      const next = [...current]
      const currentItem = next[index]
      const targetItem = next[target]
      if (!currentItem || !targetItem) return current
      next[index] = targetItem
      next[target] = currentItem
      return next
    })
  }

  return (
    <>
      <div className="mb-2.5">
        {items.length === 0 ? (
          <p className={showErrors ? 'ic-error text-ic-error' : 'text-ic-muted'}>{empty}</p>
        ) : (
          <table
            className={`w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-[5px] tabular-nums ${amounts ? 'max-[480px]:block' : ''}`}
            role="table"
          >
            <caption className="sr-only">{caption}</caption>
            <thead
              role="rowgroup"
              className={
                amounts
                  ? 'bg-(--ic-doc-soft) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=modern]/proof:bg-transparent max-[480px]:sr-only'
                  : undefined
              }
            >
              <tr role="row">
                <th
                  scope="col"
                  role="columnheader"
                  className={
                    amounts
                      ? 'px-1 py-[7px] text-start text-xs font-bold text-(--ic-doc-amount-ink) group-data-[invoice-layout=minimal]/proof:border-y group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=minimal]/proof:text-ic-ink group-data-[invoice-layout=modern]/proof:border-y group-data-[invoice-layout=modern]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=modern]/proof:bg-transparent group-data-[invoice-layout=modern]/proof:text-(--ic-doc-accent)'
                      : 'px-1 pt-0 pb-0.5 text-start text-xs font-bold text-ic-muted'
                  }
                >
                  Description
                </th>
                <th
                  scope="col"
                  role="columnheader"
                  className={
                    amounts
                      ? 'w-[62px] px-1 py-[7px] text-start text-xs font-bold text-(--ic-doc-amount-ink) group-data-[invoice-layout=minimal]/proof:border-y group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=minimal]/proof:text-ic-ink group-data-[invoice-layout=modern]/proof:border-y group-data-[invoice-layout=modern]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=modern]/proof:bg-transparent group-data-[invoice-layout=modern]/proof:text-(--ic-doc-accent) max-[480px]:w-12'
                      : 'w-[62px] px-1 pt-0 pb-0.5 text-start text-xs font-bold text-ic-muted max-[480px]:w-12'
                  }
                >
                  Qty
                </th>
                <th
                  scope="col"
                  role="columnheader"
                  className={
                    amounts
                      ? 'w-[82px] px-1 py-[7px] text-start text-xs font-bold text-(--ic-doc-amount-ink) group-data-[invoice-layout=minimal]/proof:border-y group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=minimal]/proof:text-ic-ink group-data-[invoice-layout=modern]/proof:border-y group-data-[invoice-layout=modern]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=modern]/proof:bg-transparent group-data-[invoice-layout=modern]/proof:text-(--ic-doc-accent) max-[480px]:w-[68px]'
                      : 'w-[82px] px-1 pt-0 pb-0.5 text-start text-xs font-bold text-ic-muted max-[480px]:w-[68px]'
                  }
                >
                  Rate
                </th>
                {amounts && (
                  <th
                    scope="col"
                    role="columnheader"
                    className="w-[108px] py-[7px] pr-1.5 pl-1 text-end text-xs font-bold text-(--ic-doc-amount-ink) group-data-[invoice-layout=minimal]/proof:border-y group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=minimal]/proof:text-ic-ink group-data-[invoice-layout=modern]/proof:border-y group-data-[invoice-layout=modern]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=modern]/proof:bg-transparent group-data-[invoice-layout=modern]/proof:text-(--ic-doc-accent)"
                  >
                    Amount
                  </th>
                )}
                <th
                  scope="col"
                  role="columnheader"
                  className={
                    amounts
                      ? `${reorderable ? 'w-[104px]' : 'w-10'} px-1 py-[7px] text-start text-xs font-bold text-(--ic-doc-amount-ink) group-data-[invoice-layout=minimal]/proof:border-y group-data-[invoice-layout=minimal]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=minimal]/proof:bg-transparent group-data-[invoice-layout=minimal]/proof:text-ic-ink group-data-[invoice-layout=modern]/proof:border-y group-data-[invoice-layout=modern]/proof:border-(--ic-doc-accent) group-data-[invoice-layout=modern]/proof:bg-transparent group-data-[invoice-layout=modern]/proof:text-(--ic-doc-accent) max-[480px]:w-9`
                      : `${reorderable ? 'w-[104px] max-[480px]:w-[68px]' : 'w-10 max-[480px]:w-9'} px-1 pt-0 pb-0.5 text-start text-xs font-bold text-ic-muted`
                  }
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className={amounts ? 'max-[480px]:block' : undefined}>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  role="row"
                  className={
                    amounts
                      ? `max-[480px]:grid ${reorderable ? 'max-[480px]:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.2fr)]' : 'max-[480px]:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.2fr)_36px]'} max-[480px]:items-end max-[480px]:gap-[5px] max-[480px]:border-b max-[480px]:border-ic-line max-[480px]:py-2 [&_input]:px-[7px] max-[480px]:[&_input]:px-[5px] [&+tr>td]:border-t [&+tr>td]:border-ic-line [&+tr>td]:pt-[7px] max-[480px]:[&+tr>td]:border-0 max-[480px]:[&+tr>td]:p-0`
                      : '[&_input]:px-[7px] max-[480px]:[&_input]:px-[5px] [&+tr>td]:border-t [&+tr>td]:border-ic-line [&+tr>td]:pt-[7px]'
                  }
                >
                  <td
                    role="cell"
                    className={
                      amounts
                        ? 'px-0.5 max-[480px]:col-span-full max-[480px]:min-w-0 max-[480px]:border-0 max-[480px]:p-0'
                        : 'px-0.5'
                    }
                  >
                    <input
                      id={descriptionId(item.id)}
                      aria-label={`Description, item ${index + 1}`}
                      aria-invalid={showErrors && !item.description.trim() ? true : undefined}
                      maxLength={240}
                      placeholder={amounts ? 'e.g. Design services' : 'Service or product'}
                      value={item.description}
                      onChange={(event) => update(item.id, 'description', event.target.value)}
                    />
                  </td>
                  {(['quantity', 'rate'] as const).map((key) => (
                    <td
                      key={key}
                      role="cell"
                      className={
                        amounts
                          ? 'px-0.5 max-[480px]:min-w-0 max-[480px]:border-0 max-[480px]:p-0'
                          : 'px-0.5'
                      }
                    >
                      {amounts && (
                        <span className={mobileLabelClass} aria-hidden="true">
                          {key === 'quantity' ? 'Qty' : 'Rate'}
                        </span>
                      )}
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
                  {amounts && (
                    <td
                      className="pr-1.5 pl-0.5 text-end text-xs font-[680] max-[480px]:min-w-0 max-[480px]:self-stretch max-[480px]:border-0 max-[480px]:p-0 max-[480px]:text-start"
                      role="cell"
                    >
                      <span className={mobileLabelClass} aria-hidden="true">
                        Amount
                      </span>
                      {amounts[index]}
                    </td>
                  )}
                  <td
                    role="cell"
                    className={
                      amounts
                        ? `px-0.5 ${reorderable ? 'max-[480px]:col-span-full max-[480px]:flex max-[480px]:justify-end' : ''} max-[480px]:min-w-0 max-[480px]:border-0 max-[480px]:p-0`
                        : 'px-0.5'
                    }
                  >
                    <div
                      className={
                        reorderable
                          ? 'flex items-center justify-end gap-0.5 max-[480px]:flex-wrap'
                          : 'flex items-center justify-end'
                      }
                    >
                      {reorderable && (
                        <>
                          <button
                            className={compactActionClass}
                            type="button"
                            disabled={index === 0}
                            aria-label={`Move item ${index + 1} up`}
                            title="Move item up"
                            onClick={() => move(index, -1)}
                          >
                            <Icon name="chevron" className="size-3.5 flex-none rotate-180" />
                          </button>
                          <button
                            className={compactActionClass}
                            type="button"
                            disabled={index === items.length - 1}
                            aria-label={`Move item ${index + 1} down`}
                            title="Move item down"
                            onClick={() => move(index, 1)}
                          >
                            <Icon name="chevron" className="size-3.5 flex-none" />
                          </button>
                        </>
                      )}
                      <button
                        className={reorderable ? compactActionClass : iconButtonClass}
                        type="button"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => {
                          const next = items[index + 1] ?? items[index - 1]
                          const target = next ? descriptionId(next.id) : addButtonId
                          document.getElementById(target)?.focus()
                          edit((current) => current.filter((line) => line.id !== item.id))
                        }}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className={actionsClass}>
        <button
          id={addButtonId}
          className={buttonClass}
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
      </div>
      <p id={helpId} className="mt-2 font-sans text-xs text-ic-muted">
        Use up to three decimal places. Rates use {currency}.
      </p>
    </>
  )
}
