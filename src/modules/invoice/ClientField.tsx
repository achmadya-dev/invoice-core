import { useState } from 'react'
import { blankContact, type Contact, type Invoice, type Theme } from './domain/invoice'
import { SearchField } from './invoice-ui'

function normalized(value: string) {
  return value.trim().toLowerCase()
}

export function ClientField({
  client,
  invoices,
  theme,
  onChange,
}: {
  client: Contact
  invoices: Invoice[]
  theme: Theme
  onChange: (client: Contact) => void
}) {
  const [query, setQuery] = useState<string | null>(null)
  const search = normalized(query ?? '')
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
  const commitName = (name: string, forceNew = false) => {
    const trimmed = name.trim()
    if (!forceNew && trimmed === client.name) return
    onChange({
      ...(!forceNew && normalized(client.name) === normalized(trimmed) ? client : blankContact),
      name: trimmed,
    })
  }
  return (
    <SearchField
      label="Client"
      query={query ?? client.name}
      options={search ? [...options, { value: 'new', label: `Add “${query?.trim()}”` }] : options}
      placeholder="Search clients or enter a new name"
      empty="Type a name to add a client."
      theme={theme}
      onQuery={setQuery}
      onSelect={(value) => {
        if (value === 'new') commitName(query ?? '', true)
        else {
          const selected = previous.get(value)
          if (selected) onChange(selected)
        }
        setQuery(null)
      }}
      onDismiss={(cancelled) => {
        if (!cancelled && query !== null) commitName(query)
        setQuery(null)
      }}
    />
  )
}
