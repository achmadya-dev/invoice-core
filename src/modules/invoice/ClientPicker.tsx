import { useState } from 'react'
import type { Contact, Invoice, Theme } from './domain/invoice'
import { PickerModal } from './invoice-ui'

function normalized(value: string) {
  return value.trim().toLowerCase()
}

export function ClientPicker({
  open,
  invoices,
  theme,
  onChange,
  onClose,
}: {
  open: boolean
  invoices: Invoice[]
  theme: Theme
  onChange: (client: Contact) => void
  onClose: () => void
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
    <PickerModal
      open={open}
      title="Use saved client"
      description="Choose a saved client to fill the billing details."
      searchLabel="Search saved clients"
      placeholder="Name or email"
      empty={invoices.length ? 'No matching clients.' : 'No saved clients yet.'}
      actionLabel="Select"
      query={query}
      options={options}
      theme={theme}
      onQuery={setQuery}
      onSelect={(value) => {
        const selected = previous.get(value)
        if (selected) onChange(selected)
        setQuery('')
        onClose()
      }}
      onClose={() => {
        setQuery('')
        onClose()
      }}
    />
  )
}
