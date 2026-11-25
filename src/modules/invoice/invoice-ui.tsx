import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Combobox } from '@base-ui/react/combobox'
import { Dialog } from '@base-ui/react/dialog'
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
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'

const countryOptions = countryCodes
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))

const icons = {
  mark: 'M4 5h10l6 6v8h-5v-6l-4-4H4zM4 13h5l3 3v3H4z',
  edit: 'M12 20H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10m-5 12 1-4 7.5-7.5a1.4 1.4 0 0 1 2 2L13 15l-3 2Z',
  plus: 'M12 5v14M5 12h14',
  close: 'm7 7 10 10M17 7 7 17',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4',
  upload: 'M12 15V3m-5 5 5-5 5 5M4 16v4h16v-4',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 4 4L19 6',
  pipette:
    'm14 4 6 6m-2-2-9.5 9.5a2 2 0 0 1-1.1.55L4 19l.95-3.4a2 2 0 0 1 .55-1.1L15 5l3 3Zm-5 1 6 6',
} as const

export function shouldOpenRecordRow(event: MouseEvent<HTMLLIElement>) {
  if (
    event.target instanceof Element &&
    event.target.closest('button, a, input, select, textarea, .ic-actions')
  ) {
    return false
  }
  return !window.getSelection()?.toString()
}

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

type PickerOption = { value: string; label: string; detail?: string }

export function PickerModal({
  open,
  title,
  description,
  searchLabel,
  placeholder,
  empty,
  actionLabel,
  query,
  options,
  error,
  theme,
  onQuery,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  searchLabel: string
  placeholder: string
  empty: string
  actionLabel: string
  query: string
  options: PickerOption[]
  error?: string
  theme: Theme
  onQuery: (query: string) => void
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <WorkspaceDialog
      open={open}
      title={title}
      description={description}
      theme={theme}
      size="compact"
      nested
      onClose={onClose}
    >
      <div className="ic-dialog-body ic-picker-body">
        <label className="ic-field">
          {searchLabel}
          <input
            type="search"
            maxLength={120}
            placeholder={placeholder}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        {error && (
          <p className="ic-banner ic-error" role="alert">
            {error}
          </p>
        )}
        {options.length === 0 ? (
          <p className="ic-picker-empty">{empty}</p>
        ) : (
          <ul className="ic-picker-list">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="ic-picker-option"
                  onClick={() => onSelect(option.value)}
                >
                  <span className="ic-picker-text">
                    <strong>{option.label}</strong>
                    {option.detail && <small>{option.detail}</small>}
                  </span>
                  <span className="ic-picker-action">{actionLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorkspaceDialog>
  )
}

export function WorkspaceDialog({
  open,
  title,
  description,
  theme,
  size = 'default',
  nested = false,
  headerExtra,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
  theme: Theme
  size?: 'default' | 'compact' | 'wide'
  nested?: boolean
  headerExtra?: ReactNode
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
        <Dialog.Backdrop
          className={nested ? 'ic-modal-backdrop ic-nested-backdrop' : 'ic-modal-backdrop'}
        />
        <Dialog.Viewport
          className={
            size === 'wide'
              ? 'ic-modal-viewport ic-invoice-modal-viewport'
              : nested
                ? 'ic-modal-viewport ic-nested-viewport'
                : 'ic-modal-viewport'
          }
        >
          <Dialog.Popup
            className={
              size === 'wide'
                ? 'ic-modal-popup ic-workspace-dialog ic-workspace-dialog-wide'
                : size === 'compact'
                  ? 'ic-modal-popup ic-workspace-dialog ic-workspace-dialog-compact'
                  : 'ic-modal-popup ic-workspace-dialog'
            }
            data-theme={theme}
          >
            <div className="ic-dialog-heading">
              <Dialog.Title className="ic-modal-title">{title}</Dialog.Title>
              <Dialog.Close className="ic-icon-button" aria-label="Close dialog">
                <Icon name="close" />
              </Dialog.Close>
            </div>
            {headerExtra ? (
              <div className="ic-dialog-intro">
                <Dialog.Description className="ic-modal-description">
                  {description}
                </Dialog.Description>
                {headerExtra}
              </div>
            ) : (
              <Dialog.Description className="ic-modal-description">
                {description}
              </Dialog.Description>
            )}
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
          className={sheet && field.key === 'name' ? 'ic-field ic-sheet-name' : 'ic-field'}
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
      <label className={sheet ? 'ic-field' : 'ic-field ic-span'}>
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
  invalidName = false,
}: {
  sender: Sender
  onChange: (patch: Partial<Sender>) => void
  theme: Theme
  invalidName?: boolean
}) {
  return (
    <>
      <ContactFields
        party="sender"
        contact={sender}
        onChange={onChange}
        invalidName={invalidName}
      />
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

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  const inputId = useId()
  return (
    <div className="ic-field ic-color-field">
      <label htmlFor={inputId}>{label}</label>
      <span className="ic-color-control" title={value.toUpperCase()}>
        <span className="ic-color-swatch" style={{ backgroundColor: value }} aria-hidden="true" />
        <Icon name="pipette" />
        <input
          id={inputId}
          type="color"
          className="ic-color-native"
          value={value}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
        />
      </span>
    </div>
  )
}
