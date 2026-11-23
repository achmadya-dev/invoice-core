import { useRef, useState } from 'react'
import {
  maxTemplates,
  newLineItemTemplate,
  type Currency,
  type LineItemTemplate,
} from './domain/invoice'
import { CurrencySelect, Icon } from './invoice-ui'
import { LineItems } from './LineItems'

export function TemplatesPanel({
  templates,
  defaultCurrency,
  save,
  requestRemove,
}: {
  templates: LineItemTemplate[]
  defaultCurrency: Currency
  save: (template: LineItemTemplate) => { ok: true } | { ok: false; message?: string }
  requestRemove: (template: LineItemTemplate, onDeleted: () => void) => void
}) {
  const [selected, setSelected] = useState<LineItemTemplate | null>(null)
  const [error, setError] = useState('')
  const nameField = useRef<HTMLInputElement>(null)
  const formTrigger = useRef<HTMLButtonElement>(null)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const existing = templates.find((template) => template.id === selected?.id)

  function open(template: LineItemTemplate, trigger: HTMLButtonElement) {
    formTrigger.current = trigger
    setSelected(template)
    setError('')
    requestAnimationFrame(() => nameField.current?.focus())
  }

  function close() {
    setSelected(null)
    setError('')
    requestAnimationFrame(() => {
      const trigger = formTrigger.current
      if (trigger?.isConnected && !trigger.disabled) trigger.focus()
      else listHeading.current?.focus()
    })
  }

  return (
    <div className="ic-company-layout">
      <section className="ic-editor ic-panel" aria-labelledby="saved-templates">
        <div className="ic-panel-bar">
          <h2 id="saved-templates" ref={listHeading} tabIndex={-1}>
            My templates
          </h2>
        </div>
        {templates.length ? (
          <ul className="ic-profile-list">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="ic-profile"
                  aria-pressed={selected?.id === template.id}
                  onClick={(event) => open(template, event.currentTarget)}
                >
                  <span>{template.name}</span>
                  <span className="ic-mono">{template.currency}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ic-empty">No custom templates yet.</p>
        )}
        <div className="ic-panel-pad">
          <button
            type="button"
            className="ic-button"
            disabled={templates.length >= maxTemplates}
            onClick={(event) => open(newLineItemTemplate(defaultCurrency), event.currentTarget)}
          >
            <Icon name="plus" /> New template
          </button>
        </div>
      </section>
      {selected ? (
        <section className="ic-editor ic-panel" aria-labelledby="template-form-title">
          <div className="ic-panel-bar">
            <h2 id="template-form-title">{existing ? 'Edit template' : 'New template'}</h2>
          </div>
          <form
            className="ic-panel-pad"
            aria-labelledby="template-form-title"
            onChange={() => setError('')}
            onSubmit={(event) => {
              event.preventDefault()
              const result = save(selected)
              if (result.ok) close()
              else setError(result.message ?? '')
            }}
          >
            <div className="ic-fields">
              <label className="ic-field">
                Template name
                <input
                  ref={nameField}
                  value={selected.name}
                  maxLength={120}
                  placeholder="Monthly maintenance"
                  required
                  onChange={(event) => setSelected({ ...selected, name: event.target.value })}
                />
              </label>
              <CurrencySelect
                label="Template currency"
                value={selected.currency}
                onChange={(currency) => {
                  setSelected({ ...selected, currency })
                  setError('')
                }}
              />
            </div>
            <div className="ic-note">
              <LineItems
                items={selected.items}
                edit={(update) => {
                  setSelected((current) =>
                    current ? { ...current, items: update(current.items) } : current,
                  )
                  setError('')
                }}
                currency={selected.currency}
                caption="Template line items"
                empty="Add a line item to save this template."
              />
            </div>
            {error && (
              <p className="ic-error ic-note" role="alert">
                {error}
              </p>
            )}
            <div className="ic-actions ic-note">
              <button className="ic-button ic-primary" type="submit">
                Save template
              </button>
              <button className="ic-button" type="button" onClick={close}>
                Cancel
              </button>
              {existing && (
                <button
                  className="ic-text-button"
                  type="button"
                  onClick={() => requestRemove(existing, close)}
                >
                  Delete template
                </button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section className="ic-editor ic-empty">
          <h2>Reuse recurring line items</h2>
          <p>
            Save descriptions, quantities, and rates together. Apply a template from the editor’s
            Line items section to an invoice in the same currency.
          </p>
        </section>
      )}
    </div>
  )
}
