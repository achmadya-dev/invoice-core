import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Combobox } from '@base-ui/react/combobox'
import { Dialog } from '@base-ui/react/dialog'
import { Popover } from '@base-ui/react/popover'
import { Select } from '@base-ui/react/select'
import { countryCodes, countryName, currencies, currencyName } from './domain/catalog'
import {
  decimalValid,
  type Contact,
  type Currency,
  type Sender,
  type Theme,
} from './domain/invoice'
import { readLogo } from './workspace.browser'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

const countryOptions = countryCodes
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))

const icons = {
  mark: 'M4 5h10l6 6v8h-5v-6l-4-4H4zM4 13h5l3 3v3H4z',
  document:
    'M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9m-6-6v6h6m-6-6 6 6M8 13h8m-8 4h5',
  edit: 'M12 20H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10m-5 12 1-4 7.5-7.5a1.4 1.4 0 0 1 2 2L13 15l-3 2Z',
  plus: 'M12 5v14M5 12h14',
  close: 'm7 7 10 10M17 7 7 17',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
  expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  collapse: 'M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5 5-5-5 5-5',
  system: 'M3 5h18v12H3zM12 17v3m-4 0h8',
  light:
    'M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
  dark: 'M20.8 14.4A9 9 0 0 1 9.6 3.2a9 9 0 1 0 11.2 11.2Z',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 4 4L19 6',
} as const

export function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg className="ic-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={icons[name]}
        fill={name === 'mark' ? 'currentColor' : 'none'}
        stroke={name === 'mark' ? 'none' : 'currentColor'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CurrencySelect({
  label = 'Currency',
  value,
  onChange,
}: {
  label?: string
  value: Currency
  onChange: (value: Currency) => void
}) {
  return (
    <SelectField
      label={label}
      value={value}
      options={currencies.map((code) => ({
        value: code,
        label: `${code} — ${currencyName(code)}`,
      }))}
      onChange={(nextValue) => {
        const match = currencies.find((code) => code === nextValue)
        if (match) onChange(match)
      }}
    />
  )
}

type SelectOption = { value: string; label: string }

export function DecimalField({
  label,
  value,
  kind,
  onChange,
}: {
  label: string
  value: string
  kind: 'quantity' | 'amount' | 'percent'
  onChange: (value: string) => void
}) {
  return (
    <label className="ic-field">
      {label}
      <input
        inputMode="decimal"
        maxLength={16}
        aria-invalid={!decimalValid(value, kind)}
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

type SearchOption = { value: string; label: string; detail?: string }

export function SearchField({
  label,
  query,
  options,
  placeholder,
  empty,
  theme,
  disabled,
  onQuery,
  onSelect,
  onDismiss,
}: {
  label: string
  query: string
  options: SearchOption[]
  placeholder: string
  empty: string
  theme: Theme
  disabled?: boolean
  onQuery: (query: string) => void
  onSelect: (value: string) => void
  onDismiss?: (cancelled: boolean) => void
}) {
  const id = useId()
  return (
    <Combobox.Root<SearchOption>
      items={options}
      filter={null}
      value={null}
      disabled={disabled}
      inputValue={query}
      onInputValueChange={(value, details) => {
        // The library clears its selection on popup cleanup; only actual edits change our draft.
        if (details.reason === 'input-change') onQuery(value)
      }}
      onValueChange={(option) => {
        if (option) onSelect(option.value)
      }}
      onOpenChange={(open, details) => {
        if (!open && details.reason !== 'item-press') onDismiss?.(details.reason === 'escape-key')
      }}
    >
      <div className="ic-field">
        <label htmlFor={id}>{label}</label>
        <Combobox.InputGroup className="ic-country-group ic-search-group">
          <Combobox.Input
            id={id}
            className="ic-country-input"
            placeholder={placeholder}
            maxLength={120}
          />
          <Combobox.Trigger
            className="ic-country-trigger"
            aria-label={`Show ${label.toLowerCase()} options`}
          >
            <Icon name="chevron" />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner
            className="ic-country-positioner"
            sideOffset={4}
            collisionPadding={12}
          >
            <Combobox.Popup className="ic-country-popup" data-theme={theme}>
              <Combobox.Empty>
                <div className="ic-country-empty">{empty}</div>
              </Combobox.Empty>
              <Combobox.List className="ic-country-list">
                {(option: SearchOption) => (
                  <Combobox.Item
                    key={option.value}
                    value={option}
                    className="ic-country-option ic-search-option"
                  >
                    <span>{option.label}</span>
                    {option.detail && <small>{option.detail}</small>}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </div>
    </Combobox.Root>
  )
}

export function WorkspaceDialog({
  open,
  title,
  description,
  theme,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
  theme: Theme
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="ic-modal-backdrop" />
        <Dialog.Viewport className="ic-modal-viewport">
          <Dialog.Popup className="ic-modal-popup ic-workspace-dialog" data-theme={theme}>
            <div className="ic-dialog-heading">
              <Dialog.Title className="ic-modal-title">{title}</Dialog.Title>
              <Dialog.Close className="ic-icon-button" aria-label="Close dialog">
                <Icon name="close" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="ic-modal-description">{description}</Dialog.Description>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <Select.Root
      items={options}
      value={value}
      modal={false}
      onValueChange={(nextValue) => {
        if (typeof nextValue === 'string') onChange(nextValue)
      }}
    >
      <div className="ic-field">
        <Select.Label>{label}</Select.Label>
        <Select.Trigger className="ic-select-trigger">
          <Select.Value />
          <Select.Icon className="ic-select-icon">
            <Icon name="chevron" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Positioner
          className="ic-select-positioner"
          align="start"
          sideOffset={4}
          collisionPadding={12}
          alignItemWithTrigger={false}
          positionMethod="fixed"
        >
          <Select.Popup className="ic-select-popup">
            <Select.List className="ic-select-list">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  className="ic-select-option"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="ic-select-indicator">
                    <Icon name="check" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </div>
    </Select.Root>
  )
}

const countryItems = Combobox.createItems(countryOptions, {
  getValue: (country) => country.code,
  getLabel: (country) => country.name,
})

export function CountrySelect({
  label,
  value,
  onChange,
  theme,
  span = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  theme: Theme
  span?: boolean
}) {
  const id = useId()
  return (
    <Combobox.Root
      items={countryItems}
      value={value || null}
      onValueChange={(nextValue) => onChange(typeof nextValue === 'string' ? nextValue : '')}
    >
      <div className={span ? 'ic-field ic-span' : 'ic-field'}>
        <label htmlFor={id}>{label}</label>
        <Combobox.InputGroup className="ic-country-group">
          <Combobox.Input id={id} className="ic-country-input" placeholder="Search countries" />
          <Combobox.Trigger
            className="ic-country-trigger"
            aria-label={`Show ${label.toLowerCase()} options`}
          >
            <Icon name="chevron" />
          </Combobox.Trigger>
          {value && (
            <Combobox.Clear
              className="ic-country-clear"
              aria-label={`Clear ${label.toLowerCase()}`}
            >
              <Icon name="close" />
            </Combobox.Clear>
          )}
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className="ic-country-positioner" sideOffset={4}>
            <Combobox.Popup className="ic-country-popup" data-theme={theme}>
              <Combobox.Empty>
                <div className="ic-country-empty">No countries match.</div>
              </Combobox.Empty>
              <Combobox.List className="ic-country-list">
                {(country) => (
                  <Combobox.Item
                    key={country.code}
                    value={country.code}
                    className="ic-country-option"
                  >
                    <Combobox.ItemIndicator className="ic-country-indicator">
                      <Icon name="check" />
                    </Combobox.ItemIndicator>
                    <span>{country.name}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </div>
    </Combobox.Root>
  )
}

const contactFields = [
  { key: 'name', type: 'text', sender: 'e.g. Northline Studio', client: 'e.g. Fieldwork Press' },
  {
    key: 'email',
    type: 'email',
    sender: 'e.g. hello@example.com',
    client: 'e.g. billing@example.com',
  },
  { key: 'phone', type: 'tel', sender: 'e.g. +1 555 0100', client: 'e.g. +1 555 0101' },
] as const

export function ContactFields({
  contact,
  onChange,
  party,
  sheet = false,
  invalidName = false,
}: {
  contact: Contact
  onChange: (patch: Partial<Contact>) => void
  party: 'sender' | 'client'
  sheet?: boolean
  invalidName?: boolean
}) {
  const partyLabel = party === 'sender' ? 'Sender' : 'Billing contact'
  return (
    <>
      {contactFields.map((field) => (
        <label
          className={`ic-field${sheet && field.key === 'name' ? 'ic-sheet-name' : ''}`}
          key={field.key}
        >
          <span className={sheet ? 'sr-only' : undefined}>
            {party === 'client' && field.key === 'name' ? 'Client' : `${partyLabel} ${field.key}`}
          </span>
          <input
            type={field.type}
            maxLength={120}
            aria-invalid={field.key === 'name' && invalidName ? true : undefined}
            placeholder={sheet ? field[party] : undefined}
            value={contact[field.key]}
            onChange={(event) => onChange({ [field.key]: event.target.value })}
          />
        </label>
      ))}
      <label className={`ic-field${sheet ? '' : 'ic-span'}`}>
        <span className={sheet ? 'sr-only' : undefined}>{partyLabel} address</span>
        <textarea
          maxLength={1500}
          rows={sheet ? 1 : 2}
          placeholder={sheet ? 'e.g. 10 Market Street, Suite 2' : undefined}
          value={contact.address}
          onChange={(event) => onChange({ address: event.target.value })}
        />
      </label>
    </>
  )
}

export function SenderFields({
  sender,
  onChange,
  theme,
}: {
  sender: Sender
  onChange: (patch: Partial<Sender>) => void
  theme: Theme
}) {
  return (
    <>
      <ContactFields party="sender" contact={sender} onChange={onChange} />
      <CountrySelect
        label="Sender country"
        value={sender.country}
        onChange={(country) => onChange({ country })}
        theme={theme}
      />
      <label className="ic-field">
        Website
        <input
          maxLength={120}
          value={sender.website}
          onChange={(event) => onChange({ website: event.target.value })}
        />
      </label>
      <label className="ic-field">
        Tax ID
        <input
          maxLength={120}
          value={sender.taxId}
          onChange={(event) => onChange({ taxId: event.target.value })}
        />
      </label>
      <label className="ic-field ic-span">
        Payment details
        <textarea
          maxLength={1500}
          rows={2}
          value={sender.paymentDetails}
          onChange={(event) => onChange({ paymentDetails: event.target.value })}
        />
      </label>
      <LogoField logo={sender.logo} onChange={(logo) => onChange({ logo })} />
    </>
  )
}

export function LogoField({
  logo,
  onChange,
  inline = false,
}: {
  logo: string
  onChange: (logo: string) => void
  inline?: boolean
}) {
  const [logoError, setLogoError] = useState('')
  const readAttempt = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(
    () => () => {
      readAttempt.current += 1
    },
    [],
  )
  return (
    <div className={inline ? 'ic-sheet-logo' : 'ic-span ic-logo-field'}>
      <label className={inline ? 'ic-logo-upload' : 'ic-field'}>
        {inline ? (
          <>
            {logo && <img className="ic-logo" src={logo} alt="Invoice logo" />}
            <span>
              <Icon name={logo ? 'edit' : 'plus'} /> {logo ? 'Change logo' : 'Upload logo'}
            </span>
          </>
        ) : (
          'Company logo (PNG or JPEG, up to 256 KB)'
        )}
        <input
          ref={fileInput}
          type="file"
          aria-label={inline ? (logo ? 'Change logo' : 'Upload logo') : undefined}
          accept="image/png,image/jpeg"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            const attempt = ++readAttempt.current
            try {
              const image = await readLogo(file)
              if (attempt !== readAttempt.current) return
              if (!image)
                setLogoError(
                  'Choose a valid PNG or JPEG image up to 256 KB and 4,096 pixels per side.',
                )
              else {
                onChange(image)
                setLogoError('')
              }
            } catch {
              if (attempt === readAttempt.current) setLogoError('The logo could not be read.')
            }
          }}
        />
      </label>
      {logoError && (
        <p className="ic-span ic-error" role="alert">
          {logoError}
        </p>
      )}
      {logo && (
        <div className="ic-span ic-actions">
          {!inline && <img className="ic-logo" src={logo} alt="" />}
          <button
            type="button"
            className={inline ? 'ic-text-button' : 'ic-button'}
            onClick={() => {
              readAttempt.current += 1
              setLogoError('')
              onChange('')
              fileInput.current?.focus()
            }}
          >
            Remove logo
          </button>
        </div>
      )}
    </div>
  )
}

export type ConfirmState = {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
}

export function ConfirmModal({
  confirm,
  theme,
  onClose,
}: {
  confirm: ConfirmState | null
  theme: Theme
  onClose: () => void
}) {
  return (
    <AlertDialog.Root
      open={confirm !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="ic-modal-backdrop ic-confirm-backdrop" />
        <AlertDialog.Viewport className="ic-modal-viewport ic-confirm-viewport">
          <AlertDialog.Popup className="ic-modal-popup" data-theme={theme}>
            {confirm && (
              <>
                <AlertDialog.Title className="ic-modal-title">{confirm.title}</AlertDialog.Title>
                <AlertDialog.Description className="ic-modal-description">
                  {confirm.description}
                </AlertDialog.Description>
                <div className="ic-modal-actions">
                  <AlertDialog.Close className="ic-button">
                    {confirm.cancelLabel ?? 'Cancel'}
                  </AlertDialog.Close>
                  <button
                    type="button"
                    className={`ic-button ${confirm.danger ? 'ic-danger' : 'ic-primary'}`}
                    onClick={() => {
                      const action = confirm.onConfirm
                      onClose()
                      action()
                    }}
                  >
                    {confirm.confirmLabel}
                  </button>
                </div>
              </>
            )}
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

const accentSwatches = [
  { name: 'Indigo', hex: '#4837a6' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Emerald', hex: '#047857' },
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Blue', hex: '#1d4ed8' },
  { name: 'Violet', hex: '#6d28d9' },
  { name: 'Amber', hex: '#b45309' },
  { name: 'Rose', hex: '#be123c' },
  { name: 'Crimson', hex: '#b91c1c' },
  { name: 'Charcoal', hex: '#18181b' },
] as const

export function ColorPicker({
  label,
  value,
  theme,
  onChange,
}: {
  label: string
  value: string
  theme: Theme
  onChange: (hex: string) => void
}) {
  const labelId = useId()
  const valueId = useId()
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState(value.toUpperCase())
  const normalized = value.toLowerCase()

  return (
    <div className="ic-field">
      <span id={labelId}>{label}</span>
      <Popover.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) setHexDraft(value.toUpperCase())
        }}
        modal={false}
      >
        <Popover.Trigger
          className="ic-select-trigger ic-color-trigger"
          aria-labelledby={`${labelId} ${valueId}`}
        >
          <span className="ic-color-trigger-value">
            <span
              className="ic-color-swatch"
              style={{ backgroundColor: value }}
              aria-hidden="true"
            />
            <span id={valueId} className="ic-mono">
              {value.toUpperCase()}
            </span>
          </span>
          <Icon name="chevron" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} collisionPadding={12} align="start">
            <Popover.Popup className="ic-select-popup ic-color-popup" data-theme={theme}>
              <div className="ic-color-swatches" role="group" aria-label="Color presets">
                {accentSwatches.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    className="ic-color-swatch-btn"
                    style={{ backgroundColor: swatch.hex }}
                    aria-label={swatch.name}
                    aria-pressed={normalized === swatch.hex}
                    onClick={() => {
                      onChange(swatch.hex)
                      setHexDraft(swatch.hex.toUpperCase())
                    }}
                  />
                ))}
              </div>
              <div className="ic-color-custom">
                <input
                  type="text"
                  className="ic-mono"
                  aria-label="Hex color"
                  maxLength={7}
                  value={hexDraft}
                  onChange={(event) => {
                    const next = event.target.value
                    setHexDraft(next)
                    if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toLowerCase())
                  }}
                  onBlur={() => setHexDraft(value.toUpperCase())}
                />
                <label className="ic-color-wheel" title="Custom color">
                  <input
                    type="color"
                    aria-label="Custom color"
                    value={value}
                    onChange={(event) => {
                      const next = event.target.value.toLowerCase()
                      onChange(next)
                      setHexDraft(next.toUpperCase())
                    }}
                  />
                  <span>Pick</span>
                </label>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
