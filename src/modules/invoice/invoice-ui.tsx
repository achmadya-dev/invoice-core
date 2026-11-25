import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Combobox } from '@base-ui/react/combobox'
import { Dialog } from '@base-ui/react/dialog'
import { Select } from '@base-ui/react/select'
import { countryCodes, countryName, currencies, currencyName } from './domain/catalog'
import { decimalValid, type Contact, type Currency, type Sender } from './domain/invoice'
import { readLogo } from './workspace.browser'
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'

export const shellClass =
  'ic-shell mx-auto w-[min(100%-72px,1320px)] max-[900px]:w-[calc(100%-36px)] print:block print:w-full print:max-w-none print:min-h-0 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none'
export const actionsClass = 'ic-actions flex flex-wrap items-center gap-2'
export const fieldClass = 'relative grid min-w-0 content-start gap-[5px] text-xs font-[680]'
export const fieldsGridClass = 'grid grid-cols-2 gap-x-3 gap-y-2.5 max-[480px]:gap-[9px]'
export const buttonClass =
  'inline-flex min-h-[42px] items-center justify-center gap-[7px] rounded-lg border border-ic-line bg-ic-surface px-[13px] py-2 text-[13px] font-bold whitespace-nowrap text-ic-accent enabled:hover:bg-ic-soft'
export const primaryButtonClass =
  'inline-flex min-h-[42px] items-center justify-center gap-[7px] rounded-lg border border-ic-action-bg bg-ic-action-bg px-[13px] py-2 text-[13px] font-bold whitespace-nowrap text-ic-action-ink enabled:hover:brightness-[0.92]'
export const dangerButtonClass =
  'inline-flex min-h-[42px] items-center justify-center gap-[7px] rounded-lg border border-ic-error bg-ic-error-bg px-[13px] py-2 text-[13px] font-bold whitespace-nowrap text-ic-error enabled:hover:brightness-95'
export const textButtonClass =
  'inline-flex min-h-[42px] items-center justify-center gap-[7px] rounded-lg px-[7px] py-2 text-[13px] font-bold whitespace-nowrap text-ic-accent underline decoration-transparent underline-offset-4 hover:bg-ic-soft hover:decoration-current'
export const iconButtonClass =
  'grid size-9 flex-none place-items-center rounded-lg border border-transparent bg-transparent p-0 text-ic-muted transition-[background-color,border-color,color] duration-120 hover:border-ic-line hover:bg-ic-soft hover:text-ic-accent motion-reduce:transition-none'
export const panelClass = 'min-w-0 rounded-[14px] border border-ic-line bg-ic-surface'
export const bannerClass = 'mb-3 rounded-lg bg-ic-soft px-3.5 py-[11px] print:hidden'
export const errorBannerClass =
  'ic-error mb-3 rounded-lg bg-ic-error-bg px-3.5 py-[11px] text-ic-error print:hidden'
export const docLabelClass = 'text-[10px] font-[740] tracking-[0.07em] text-ic-muted uppercase'
export const recordRowBaseClass =
  'ic-record grid cursor-pointer items-center gap-3.5 border-t border-ic-line px-[22px] py-[11px] wrap-anywhere transition-colors duration-120 last:rounded-b-[13px] [&:hover:not(:has(.ic-actions:hover))]:bg-ic-soft/55 [&:has(.ic-record-trigger:focus-visible)]:bg-ic-soft/55 [&:hover:not(:has(.ic-actions:hover))_.ic-record-trigger]:decoration-current max-[480px]:px-3.5 motion-reduce:transition-none'
export const sheetFieldLabelClass = 'relative grid min-w-0 content-start gap-0 text-xs font-normal'
export const sheetNameLabelClass =
  'relative mb-0.5 grid min-w-0 content-start gap-0 font-display text-[clamp(14px,1.7vw,19px)]/[1.15] font-[750]'
export const recordTriggerClass =
  'ic-record-trigger block min-h-0 cursor-pointer rounded-lg p-0 text-left font-bold whitespace-normal text-ic-accent underline decoration-transparent underline-offset-4 hover:bg-transparent hover:decoration-current'
export const sheetChipClass =
  'inline-flex min-h-6 items-center gap-1 rounded-md border border-ic-line bg-ic-soft px-2 py-0.5 font-sans text-[11px]/[1.2] font-[650] tracking-normal whitespace-nowrap text-ic-accent normal-case transition-[background-color,border-color] duration-120 hover:border-ic-accent hover:bg-ic-desk motion-reduce:transition-none'

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
  sun: 'M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 14.5A7.5 7.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  pipette:
    'm14 4 6 6m-2-2-9.5 9.5a2 2 0 0 1-1.1.55L4 19l.95-3.4a2 2 0 0 1 .55-1.1L15 5l3 3Zm-5 1 6 6',
} as const

export function shouldOpenRecordRow(event: MouseEvent<HTMLLIElement>) {
  if (
    event.target instanceof Element &&
    event.target.closest('button, a, input, select, textarea, summary, [role="button"]')
  ) {
    return false
  }
  return (window.getSelection()?.toString() ?? '') === ''
}

export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg className={className ?? 'size-[17px] flex-none'} viewBox="0 0 24 24" aria-hidden="true">
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
    <label className={fieldClass}>
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
  onQuery: (query: string) => void
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <WorkspaceDialog
      open={open}
      title={title}
      description={description}
      size="compact"
      nested
      onClose={onClose}
    >
      <div className="mt-4 grid gap-3">
        <label className={fieldClass}>
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
          <p
            className="ic-error rounded-lg bg-ic-error-bg px-3.5 py-[11px] text-ic-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {options.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ic-line px-3 py-[18px] text-center text-[13px] text-ic-muted">
            {empty}
          </p>
        ) : (
          <ul className="grid max-h-[min(320px,50vh)] list-none gap-1.5 overflow-y-auto overscroll-contain p-0.5">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-ic-line bg-ic-field px-3 py-2.5 text-start text-ic-ink transition-[background-color,border-color] duration-120 hover:border-ic-accent hover:bg-ic-soft motion-reduce:transition-none"
                  onClick={() => onSelect(option.value)}
                >
                  <span className="grid min-w-0 gap-0.5 wrap-anywhere">
                    <strong className="text-[13.5px] font-[680]">{option.label}</strong>
                    {option.detail && (
                      <small className="text-xs text-ic-muted">{option.detail}</small>
                    )}
                  </span>
                  <span className="flex-none text-xs font-bold text-ic-accent">{actionLabel}</span>
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
  size = 'default',
  nested = false,
  headerExtra,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
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
          className={`fixed inset-0 bg-[rgb(17_12_28/54%)] backdrop-blur-[2px] transition-opacity duration-150 ease-out data-starting-style:opacity-0 motion-reduce:transition-none print:hidden ${nested ? 'z-70' : 'z-60'}`}
        />
        <Dialog.Viewport
          className={
            size === 'wide'
              ? 'fixed inset-0 z-61 grid place-items-center items-start overflow-y-auto p-5 max-[620px]:p-2 max-[480px]:p-1 print:static print:block print:overflow-visible print:p-0'
              : `fixed inset-0 grid place-items-center overflow-y-auto p-5 ${nested ? 'z-71' : 'z-61'}`
          }
        >
          <Dialog.Popup
            className={
              size === 'wide'
                ? 'ic-modal-popup ic-workspace-dialog ic-workspace-dialog-wide w-[min(100%,988px)] rounded-[14px] border border-ic-line bg-ic-surface p-[22px] text-ic-ink shadow-[0_18px_44px_rgb(17_12_28/28%)] transition-opacity duration-120 ease-out outline-none data-starting-style:opacity-0 motion-reduce:transition-none max-[620px]:p-3.5 max-[480px]:rounded-xl max-[480px]:px-2 max-[480px]:py-3 print:block print:min-h-0 print:w-full print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-ic-ink print:shadow-none'
                : size === 'compact'
                  ? 'ic-modal-popup ic-workspace-dialog w-[min(100%,520px)] rounded-[14px] border border-ic-line bg-ic-surface p-[22px] text-ic-ink shadow-[0_18px_44px_rgb(17_12_28/28%)] transition-[opacity,transform] duration-150 ease-out outline-none data-starting-style:translate-y-1 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none'
                  : 'ic-modal-popup ic-workspace-dialog w-[min(100%,760px)] rounded-[14px] border border-ic-line bg-ic-surface p-[22px] text-ic-ink shadow-[0_18px_44px_rgb(17_12_28/28%)] transition-[opacity,transform] duration-150 ease-out outline-none data-starting-style:translate-y-1 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none'
            }
          >
            <div className="ic-dialog-heading flex items-center justify-between gap-3 print:hidden">
              <Dialog.Title className="m-0 font-display text-lg/tight font-[730]">
                {title}
              </Dialog.Title>
              <Dialog.Close className={iconButtonClass} aria-label="Close dialog">
                <Icon name="close" />
              </Dialog.Close>
            </div>
            {headerExtra ? (
              <div className="ic-dialog-intro mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 max-[620px]:flex-col max-[620px]:items-stretch print:hidden">
                <Dialog.Description className="m-0 text-sm/normal text-ic-muted">
                  {description}
                </Dialog.Description>
                {headerExtra}
              </div>
            ) : (
              <Dialog.Description className="mt-2.5 text-sm/normal text-ic-muted print:hidden">
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
      <div className={fieldClass}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger className="ic-select-trigger flex min-h-10 w-full min-w-0 items-center justify-between gap-2.5 rounded-[7px] border border-ic-line bg-ic-field px-[9px] py-[7px] text-start font-sans text-sm/[1.4] font-normal text-ic-ink data-disabled:cursor-not-allowed data-disabled:opacity-55 data-popup-open:border-ic-accent [&>:first-child]:min-w-0 [&>:first-child]:truncate">
          <Select.Value />
          <Select.Icon className="grid flex-none place-items-center text-ic-muted">
            <Icon name="chevron" className="size-[15px] flex-none" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Positioner
          className="z-50 outline-none"
          align="start"
          sideOffset={4}
          collisionPadding={12}
          alignItemWithTrigger={false}
          positionMethod="fixed"
        >
          <Select.Popup className="ic-select-popup max-h-[min(280px,var(--available-height))] w-[max(var(--anchor-width),116px)] max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg border border-ic-line bg-ic-surface p-1 text-ic-ink shadow-[0_10px_28px_rgb(25_20_38/18%)] transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
            <Select.List className="grid gap-0.5 outline-none">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  className="ic-select-option relative flex min-h-9 cursor-default items-center rounded-[5px] py-[7px] pr-[34px] pl-[9px] text-[13px]/[1.35] wrap-anywhere text-ic-ink select-none focus-visible:-outline-offset-2 data-highlighted:bg-ic-soft data-highlighted:text-ic-accent data-selected:font-[680]"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute inset-e-[9px] grid place-items-center text-ic-accent">
                    <Icon name="check" className="size-[15px] flex-none" />
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
  span = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  span?: boolean
}) {
  const id = useId()
  return (
    <Combobox.Root
      items={countryItems}
      value={value || null}
      onValueChange={(nextValue) => onChange(typeof nextValue === 'string' ? nextValue : '')}
    >
      <div className={span ? `${fieldClass} col-span-full` : fieldClass}>
        <label htmlFor={id}>{label}</label>
        <Combobox.InputGroup className="ic-country-group relative flex min-h-10 w-full min-w-0 items-center rounded-[7px] border border-ic-line bg-ic-field focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ic-accent">
          <Combobox.Input
            id={id}
            className="min-h-[38px] w-full min-w-0 rounded-[inherit] border-0 bg-transparent py-[7px] pr-[70px] pl-[9px] font-sans text-sm/[1.4] font-normal text-ic-ink outline-none placeholder:text-ic-muted placeholder:opacity-100"
            placeholder="Search countries"
          />
          <Combobox.Trigger
            className="absolute inset-y-0 inset-e-0 grid w-[34px] place-items-center rounded-[5px] border-0 bg-transparent p-0 text-ic-muted hover:bg-ic-soft hover:text-ic-accent"
            aria-label={`Show ${label.toLowerCase()} options`}
          >
            <Icon name="chevron" className="size-[15px] flex-none" />
          </Combobox.Trigger>
          {value && (
            <Combobox.Clear
              className="absolute inset-y-0 inset-e-[34px] grid w-[34px] place-items-center rounded-[5px] border-0 bg-transparent p-0 text-ic-muted hover:bg-ic-soft hover:text-ic-accent"
              aria-label={`Clear ${label.toLowerCase()}`}
            >
              <Icon name="close" className="size-[15px] flex-none" />
            </Combobox.Clear>
          )}
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className="z-63 outline-none" sideOffset={4}>
            <Combobox.Popup className="ic-country-popup max-h-[min(280px,var(--available-height))] w-[max(var(--anchor-width),116px)] max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg border border-ic-line bg-ic-surface p-1 text-ic-ink shadow-[0_10px_28px_rgb(25_20_38/18%)] transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
              <Combobox.Empty>
                <div className="p-[9px] text-[13px] text-ic-muted">No countries match.</div>
              </Combobox.Empty>
              <Combobox.List className="grid gap-0.5 outline-none">
                {(country) => (
                  <Combobox.Item
                    key={country.code}
                    value={country.code}
                    className="ic-country-option relative flex min-h-9 cursor-default items-center rounded-[5px] py-[7px] pr-[34px] pl-[9px] text-[13px]/[1.35] wrap-anywhere text-ic-ink select-none focus-visible:-outline-offset-2 data-highlighted:bg-ic-soft data-highlighted:text-ic-accent data-selected:font-[680]"
                  >
                    <Combobox.ItemIndicator className="absolute inset-e-[9px] grid place-items-center text-ic-accent">
                      <Icon name="check" className="size-[15px] flex-none" />
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
          className={
            sheet && field.key === 'name'
              ? sheetNameLabelClass
              : sheet
                ? sheetFieldLabelClass
                : fieldClass
          }
          key={field.key}
        >
          <span className={sheet ? 'sr-only' : undefined}>
            {party === 'client' && field.key === 'name' ? 'Client' : `${partyLabel} ${field.key}`}
          </span>
          <input
            type={field.type}
            maxLength={120}
            className={
              sheet && field.key === 'name'
                ? 'min-h-[26px] py-px leading-[1.45]'
                : sheet
                  ? 'min-h-[22px] py-px leading-[1.45]'
                  : undefined
            }
            aria-invalid={field.key === 'name' && invalidName ? true : undefined}
            placeholder={sheet ? field[party] : undefined}
            value={contact[field.key]}
            onChange={(event) => onChange({ [field.key]: event.target.value })}
          />
        </label>
      ))}
      <label className={sheet ? sheetFieldLabelClass : `${fieldClass} col-span-full`}>
        <span className={sheet ? 'sr-only' : undefined}>{partyLabel} address</span>
        <textarea
          maxLength={1500}
          rows={sheet ? 1 : 2}
          className={sheet ? 'min-h-[22px] py-px leading-[1.45]' : undefined}
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
  invalidName = false,
}: {
  sender: Sender
  onChange: (patch: Partial<Sender>) => void
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
      />
      <label className={fieldClass}>
        Website
        <input
          maxLength={120}
          value={sender.website}
          onChange={(event) => onChange({ website: event.target.value })}
        />
      </label>
      <label className={fieldClass}>
        Tax ID
        <input
          maxLength={120}
          value={sender.taxId}
          onChange={(event) => onChange({ taxId: event.target.value })}
        />
      </label>
      <label className={`${fieldClass} col-span-full`}>
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
    <div
      className={
        inline
          ? 'grid min-w-0 justify-items-start gap-2'
          : 'col-span-full grid min-w-0 justify-items-stretch gap-2'
      }
    >
      <label
        className={
          inline
            ? 'relative inline-grid justify-items-start gap-[5px] rounded-md border border-dashed border-ic-muted p-3 text-xs font-bold text-ic-accent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ic-accent'
            : fieldClass
        }
      >
        {inline ? (
          <>
            {logo && (
              <img
                className="max-h-[60px] max-w-[132px] object-contain object-left"
                src={logo}
                alt="Invoice logo"
              />
            )}
            <span className="flex items-center gap-1">
              <Icon name={logo ? 'edit' : 'plus'} /> {logo ? 'Change logo' : 'Upload logo'}
            </span>
          </>
        ) : (
          'Company logo (PNG or JPEG, up to 256 KB)'
        )}
        <input
          ref={fileInput}
          type="file"
          className={
            inline
              ? 'absolute inset-0 size-full min-h-0 cursor-pointer border-0 p-0 opacity-0'
              : undefined
          }
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
        <p className="ic-error col-span-full text-ic-error" role="alert">
          {logoError}
        </p>
      )}
      {logo && (
        <div className={`${actionsClass} col-span-full`}>
          {!inline && (
            <img
              className="max-h-[60px] max-w-[132px] object-contain object-left"
              src={logo}
              alt=""
            />
          )}
          <button
            type="button"
            className={inline ? textButtonClass : buttonClass}
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
  onClose,
}: {
  confirm: ConfirmState | null
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
        <AlertDialog.Backdrop className="fixed inset-0 z-70 bg-[rgb(17_12_28/54%)] backdrop-blur-[2px] transition-opacity duration-150 ease-out data-starting-style:opacity-0 motion-reduce:transition-none print:hidden" />
        <AlertDialog.Viewport className="fixed inset-0 z-71 grid place-items-center overflow-y-auto p-5">
          <AlertDialog.Popup className="ic-modal-popup w-[min(100%,440px)] rounded-[14px] border border-ic-line bg-ic-surface p-[22px] text-ic-ink shadow-[0_18px_44px_rgb(17_12_28/28%)] transition-[opacity,transform] duration-150 ease-out outline-none data-starting-style:translate-y-1 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-none">
            {confirm && (
              <>
                <AlertDialog.Title className="m-0 font-display text-lg/tight font-[730]">
                  {confirm.title}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2.5 text-sm/normal text-ic-muted">
                  {confirm.description}
                </AlertDialog.Description>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <AlertDialog.Close className={buttonClass}>
                    {confirm.cancelLabel ?? 'Cancel'}
                  </AlertDialog.Close>
                  <button
                    type="button"
                    className={confirm.danger ? dangerButtonClass : primaryButtonClass}
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
    <div className={fieldClass}>
      <label htmlFor={inputId}>{label}</label>
      <span
        className="ic-color-control relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-ic-line bg-ic-field px-2.5 text-ic-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ic-accent hover:border-ic-accent hover:text-ic-ink"
        title={value.toUpperCase()}
      >
        <span
          className="size-[18px] shrink-0 rounded-full border border-ic-line"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <Icon name="pipette" />
        <input
          id={inputId}
          type="color"
          className="absolute inset-0 size-full min-h-0 cursor-pointer border-0 p-0 opacity-0"
          value={value}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
        />
      </span>
    </div>
  )
}
