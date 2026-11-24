import { useState } from 'react'
import type { Contact, Invoice, Theme } from './domain/invoice'
import { SearchField } from './invoice-ui'

function normalized(value: string) {
  return value.trim().toLowerCase()
}

export function ClientPicker({
  invoices,
  theme,
  onChange,
}: {
  invoices: Invoice[]
  theme: Theme
  onChange: (client: Contact) => void
}) {
  const [query, setQuery] = useState('')
  const search = normalized(query)
  const previous = new Map<string, Contact>()
  for (const { client: contact } of invoices) {
    const key = `${normalized(contact.name)}\n${normalized(contact.email)}`
    if (!previous.has(key)) previous.set(key, contact)
  }
  const matches = [...previous].filter(([key]) => key.includes(search))
  const options = matches.map(([value, contact]) => ({
    value,
    label: contact.name,
    detail: contact.email,
  }))
  return (
    <SearchField
      label="Use saved client"
      query={query}
      options={options}
      placeholder="Name or email"
      empty={invoices.length ? 'No matching clients.' : 'No saved clients yet.'}
      theme={theme}
      onQuery={setQuery}
      onSelect={(value) => {
        const selected = previous.get(value)
        if (selected) onChange(selected)
        setQuery('')
      }}
      onDismiss={() => setQuery('')}
    />
  )
}
