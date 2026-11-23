import { countryCodes, countryName, currencies, currencyName } from './domain/catalog'
import type { Contact, Currency, Sender } from './domain/invoice'
import { readLogo } from './workspace.browser'
import { useEffect, useRef, useState } from 'react'

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
  arrow: 'M5 12h14m-5-5 5 5-5 5',
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
    <label className="ic-field">
      {label}
      <select
        value={value}
        onChange={(event) => {
          const match = currencies.find((code) => code === event.target.value)
          if (match) onChange(match)
        }}
      >
        {currencies.map((code) => (
          <option key={code} value={code}>
            {code} — {currencyName(code)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ContactFields({
  label,
  contact,
  onChange,
}: {
  label: string
  contact: Contact
  onChange: (patch: Partial<Contact>) => void
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
      <label className="ic-field">
        {label} country
        <select
          value={contact.country}
          onChange={(event) => onChange({ country: event.target.value })}
        >
          <option value="">Select a country</option>
          {countryOptions.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
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
}: {
  sender: Sender
  onChange: (patch: Partial<Sender>) => void
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
      <ContactFields label="Sender" contact={sender} onChange={onChange} />
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
