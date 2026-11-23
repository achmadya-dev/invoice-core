import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Combobox } from '@base-ui/react/combobox'
import { Select } from '@base-ui/react/select'
import { countryCodes, countryName, currencies, currencyName } from './domain/catalog'
import { themes, type Contact, type Currency, type Sender, type Theme } from './domain/invoice'
import { readLogo } from './workspace.browser'
import { useEffect, useId, useRef, useState } from 'react'

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

export type SelectOption = { value: string; label: string; group?: string }

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  compact = false,
  disabled = false,
  span = false,
  triggerClassName,
  popupClassName,
  align = 'start',
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  compact?: boolean
  disabled?: boolean
  span?: boolean
  triggerClassName?: string
  popupClassName?: string
  align?: 'start' | 'end'
}) {
  const groups: { name: string; items: SelectOption[] }[] = []
  for (const option of options) {
    const groupName = option.group ?? ''
    const last = groups[groups.length - 1]
    if (last && last.name === groupName) last.items.push(option)
    else groups.push({ name: groupName, items: [option] })
  }
  const hasGroups = groups.some((group) => group.name !== '')

  return (
    <Select.Root
      items={options}
      value={value === '' && placeholder ? null : value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (typeof nextValue === 'string') onChange(nextValue)
      }}
    >
      <div className={compact ? 'ic-select-compact' : span ? 'ic-field ic-span' : 'ic-field'}>
        <Select.Label className={compact ? 'sr-only' : undefined}>{label}</Select.Label>
        <Select.Trigger
          className={[
            compact ? 'ic-select-trigger ic-select-trigger-compact' : 'ic-select-trigger',
            triggerClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon className="ic-select-icon">
            <Icon name="chevron" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Positioner className="ic-select-positioner" align={align} sideOffset={4}>
          <Select.Popup className={['ic-select-popup', popupClassName].filter(Boolean).join(' ')}>
            <Select.List className="ic-select-list">
              {hasGroups
                ? groups.map((group) => (
                    <Select.Group key={group.name || 'default'} className="ic-select-group">
                      {group.name && (
                        <Select.GroupLabel className="ic-select-group-label">
                          {group.name}
                        </Select.GroupLabel>
                      )}
                      {group.items.map((option) => (
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
                    </Select.Group>
                  ))
                : options.map((option) => (
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

const themeLabels: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}
const themeOptions = themes.map((value) => ({ value, label: themeLabels[value] }))

export function ThemeSelect({
  value,
  disabled = false,
  onChange,
}: {
  value: Theme
  disabled?: boolean
  onChange: (value: Theme) => void
}) {
  return (
    <Select.Root
      items={themeOptions}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const match = themes.find((theme) => theme === nextValue)
        if (match) onChange(match)
      }}
    >
      <div className="ic-theme-picker">
        <Select.Label className="sr-only">Theme</Select.Label>
        <Select.Trigger className="ic-theme-trigger">
          <span className="ic-theme-value">
            <span className="ic-theme-icon">
              <Icon name={value} />
            </span>
            <Select.Value />
          </span>
          <Select.Icon className="ic-theme-chevron">
            <Icon name="chevron" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Positioner
          className="ic-select-positioner"
          align="end"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="ic-select-popup ic-theme-popup">
            <Select.List className="ic-select-list">
              {themeOptions.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  className="ic-select-option ic-theme-option"
                >
                  <span className="ic-theme-option-icon">
                    <Icon name={option.value} />
                  </span>
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

export function ContactFields({
  label,
  contact,
  onChange,
  theme,
}: {
  label: string
  contact: Contact
  onChange: (patch: Partial<Contact>) => void
  theme: Theme
}) {
  return (
    <>
      <label className="ic-field">
        {label} name
        <input
          maxLength={120}
          value={contact.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className="ic-field">
        {label} email
        <input
          type="email"
          maxLength={120}
          value={contact.email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </label>
      <label className="ic-field">
        {label} phone
        <input
          type="tel"
          maxLength={120}
          value={contact.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </label>
      <CountrySelect
        label={`${label} country`}
        value={contact.country}
        onChange={(country) => onChange({ country })}
        theme={theme}
      />
      <label className="ic-field ic-span">
        {label} address
        <textarea
          maxLength={1500}
          rows={2}
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
  const [logoError, setLogoError] = useState('')
  const readAttempt = useRef(0)
  useEffect(
    () => () => {
      readAttempt.current += 1
    },
    [],
  )
  return (
    <>
      <ContactFields label="Sender" contact={sender} onChange={onChange} theme={theme} />
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
      <label className="ic-field ic-span">
        Company logo (PNG or JPEG, up to 256 KB)
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            const attempt = ++readAttempt.current
            try {
              const logo = await readLogo(file)
              if (attempt !== readAttempt.current) return
              if (!logo)
                setLogoError(
                  'Choose a valid PNG or JPEG image up to 256 KB and 4,096 pixels per side.',
                )
              else {
                onChange({ logo })
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
      {sender.logo && (
        <div className="ic-span ic-actions">
          <img className="ic-logo" src={sender.logo} alt="" />
          <button
            type="button"
            className="ic-button"
            onClick={() => {
              readAttempt.current += 1
              onChange({ logo: '' })
            }}
          >
            Remove logo
          </button>
        </div>
      )}
    </>
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
        <AlertDialog.Backdrop className="ic-modal-backdrop" />
        <AlertDialog.Viewport className="ic-modal-viewport">
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
