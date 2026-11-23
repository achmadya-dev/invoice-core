import { z } from 'zod'
import { countryCodes, currencies } from './catalog'

export const invoiceStatuses = ['draft', 'sent', 'paid'] as const
export const themes = ['system', 'light', 'dark'] as const
export const maxItems = 100
export const maxInvoices = 500
export const maxCompanies = 50
const legacyTemplateLimit = 50
export const maxProducts = legacyTemplateLimit * maxItems
export const maxBackupBytes = 8 * 1024 * 1024
export const maxLogoBytes = 256 * 1024
export const currencySchema = z.enum(currencies)
export type Currency = z.infer<typeof currencySchema>

const id = z.uuid()
const label = z.string().max(120)
const memo = z.string().max(1500)
const decimalInput = z.string().max(16)
const dateInput = z.union([z.iso.date(), z.literal('')])
const country = z.string().refine((code) => code === '' || countryCodes.includes(code))
const logo = z
  .string()
  .max(Math.ceil(maxLogoBytes / 3) * 4 + 32)
  .regex(/^data:image\/(?:png|jpeg);base64,[a-z0-9+/]+={0,2}$/i)
  .or(z.literal(''))

const contactSchema = z.strictObject({
  name: label,
  email: label,
  phone: label,
  address: memo,
  country,
})
const senderSchema = contactSchema.extend({
  website: label,
  taxId: label,
  paymentDetails: memo,
  logo,
})
const companySchema = z.strictObject({
  id,
  sender: senderSchema,
  prefix: z.string().max(24),
  nextNumber: z.number().int().min(1).max(1_000_001),
  padding: z.number().int().min(1).max(8),
  currency: currencySchema,
  taxLabel: label,
  taxRate: decimalInput,
  notes: memo,
  terms: memo,
})
const itemSchema = z.strictObject({
  id,
  description: z.string().max(240),
  quantity: decimalInput,
  rate: decimalInput,
})
const templateSchema = z.strictObject({
  id,
  name: label,
  currency: currencySchema,
  items: z.array(itemSchema).min(1).max(maxItems),
})
const productSchema = itemSchema.extend({ name: label, currency: currencySchema })
const invoiceSchema = z
  .strictObject({
    id,
    companyId: id,
    sender: senderSchema,
    client: contactSchema,
    number: label,
    issueDate: dateInput,
    dueDate: dateInput,
    currency: currencySchema,
    status: z.enum(invoiceStatuses),
    items: z.array(itemSchema).max(maxItems),
    discountKind: z.enum(['percent', 'fixed']),
    discount: decimalInput,
    taxLabel: label,
    taxRate: decimalInput,
    shipping: decimalInput,
    notes: memo,
    terms: memo,
    updatedAt: z.iso.datetime(),
  })
  .refine((invoice) => unique(invoice.items.map((item) => item.id)))

export type Contact = z.infer<typeof contactSchema>
export type Sender = z.infer<typeof senderSchema>
export type Company = z.infer<typeof companySchema>
export type LineItem = z.infer<typeof itemSchema>
type LegacyTemplate = z.infer<typeof templateSchema>
export type Product = z.infer<typeof productSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type InvoiceStatus = (typeof invoiceStatuses)[number]
export type Theme = (typeof themes)[number]

function unique(values: string[]) {
  return new Set(values).size === values.length
}

function numberKey(invoice: Invoice) {
  return JSON.stringify([invoiceSenderKey(invoice), invoice.number.trim().toLowerCase()])
}

export function invoiceSenderKey(invoice: Pick<Invoice, 'companyId' | 'sender'>) {
  return invoice.companyId === manualCompanyId
    ? `manual:${invoice.sender.name.trim().toLowerCase()}`
    : invoice.companyId
}

function templateKey(template: LegacyTemplate) {
  return `${template.currency}:${template.name.trim().toLowerCase()}`
}

const workspaceV1 = z.strictObject({
  version: z.literal(1),
  companies: z.array(companySchema).max(maxCompanies),
  invoices: z.array(invoiceSchema).max(maxInvoices),
  draft: invoiceSchema,
  dirty: z.boolean(),
  theme: z.enum(themes),
})
const workspaceV2 = workspaceV1
  .extend({
    version: z.literal(2),
    templates: z.array(templateSchema).max(legacyTemplateLimit),
  })
  .refine(
    ({ templates }) =>
      unique(templates.map((template) => template.id)) &&
      unique(templates.map(templateKey)) &&
      templates.every((template) => !legacyTemplateError(template)),
  )
const workspaceV3 = workspaceV1.extend({
  version: z.literal(3),
  products: z.array(productSchema).max(maxProducts),
})

// Working drafts may hold incomplete fields; saved records obey the same rules as export.
export const workspaceSchema = z
  .discriminatedUnion('version', [workspaceV1, workspaceV2, workspaceV3])
  .transform((workspace): z.infer<typeof workspaceV3> => {
    if (workspace.version === 3) return workspace
    if (workspace.version === 1) return { ...workspace, version: 3, products: [] }
    const { templates, ...previous } = workspace
    let index = 0
    const products = templates.flatMap((template) =>
      template.items.map((item) => ({
        ...item,
        // V2 line IDs were only unique within a bundle; use reproducible, separate product IDs.
        id: `00000000-0000-4000-8001-${(index++).toString(16).padStart(12, '0')}`,
        name: (template.items.length === 1 ? template.name : item.description).trim().slice(0, 120),
        currency: template.currency,
      })),
    )
    return { ...previous, version: 3, products }
  })
  .refine(
    (workspace) =>
      unique(workspace.companies.map((company) => company.id)) &&
      unique(workspace.invoices.map((invoice) => invoice.id)) &&
      unique(workspace.invoices.map(numberKey)) &&
      unique(workspace.products.map((product) => product.id)) &&
      workspace.companies.every((company) => !companyError(company)) &&
      workspace.invoices.every((invoice) => !invoiceError(invoice)) &&
      workspace.products.every((product) => !productError(product)),
  )

export type Workspace = z.infer<typeof workspaceSchema>

export const blankContact: Contact = { name: '', email: '', phone: '', address: '', country: '' }
export const manualCompanyId = '00000000-0000-4000-8000-000000000000'
const blankSender = { ...blankContact, website: '', taxId: '', paymentDetails: '', logo: '' }

export function newCompany(name = ''): Company {
  return {
    id: crypto.randomUUID(),
    sender: { ...blankSender, name },
    prefix: 'INV-',
    nextNumber: 1,
    padding: 4,
    currency: 'USD',
    taxLabel: 'Tax',
    taxRate: '0',
    notes: '',
    terms: '',
  }
}

export function newItem(description = ''): LineItem {
  return { id: crypto.randomUUID(), description, quantity: '1', rate: '' }
}

export function newProduct(currency: Currency): Product {
  return { ...newItem(), name: '', currency }
}

function nextNumber(used: Set<string>, prefix: string, padding: number, start = 1) {
  let sequence = start
  while (sequence <= 1_000_000) {
    const number = `${prefix}${String(sequence).padStart(padding, '0')}`.trimStart()
    if (!used.has(number.toLowerCase())) return { number, sequence }
    sequence += 1
  }
  return { number: '', sequence }
}

export function nextInvoiceNumber(company: Company, invoices: Invoice[]) {
  const used = new Set(
    invoices
      .filter((invoice) => invoice.companyId === company.id)
      .map((invoice) => invoice.number.trim().toLowerCase()),
  )
  return nextNumber(used, company.prefix, company.padding, company.nextNumber)
}

export function suggestInvoiceNumber(
  draft: Pick<Invoice, 'companyId' | 'sender'>,
  invoices: Invoice[],
  company?: Company,
) {
  if (company) return nextInvoiceNumber(company, invoices).number
  const key = invoiceSenderKey(draft)
  const unspecifiedSender = draft.companyId === manualCompanyId && !draft.sender.name.trim()
  const used = new Set(
    invoices
      .filter((invoice) =>
        unspecifiedSender
          ? invoice.companyId === manualCompanyId
          : invoiceSenderKey(invoice) === key,
      )
      .map((invoice) => invoice.number.trim().toLowerCase()),
  )
  return nextNumber(used, 'INV-', 4).number
}

function localDate(date: Date, days = 0) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`
}

export function newInvoice(
  company: Company | undefined,
  invoices: Invoice[],
  now = new Date(),
): Invoice {
  return {
    id: crypto.randomUUID(),
    companyId: company?.id ?? manualCompanyId,
    sender: company?.sender ?? blankSender,
    client: blankContact,
    number: suggestInvoiceNumber(
      { companyId: company?.id ?? manualCompanyId, sender: company?.sender ?? blankSender },
      invoices,
      company,
    ),
    issueDate: company ? localDate(now) : '',
    dueDate: company ? localDate(now, 14) : '',
    currency: company?.currency ?? 'USD',
    status: 'draft',
    items: [newItem()],
    discountKind: 'percent',
    discount: '',
    taxLabel: company?.taxLabel ?? 'Tax',
    taxRate: company?.taxRate ?? '',
    shipping: '',
    notes: company?.notes ?? '',
    terms: company?.terms ?? '',
    updatedAt: now.toISOString(),
  }
}

export function newWorkspace(): Workspace {
  return {
    version: 3,
    theme: 'system',
    companies: [],
    invoices: [],
    products: [],
    draft: newInvoice(undefined, []),
    dirty: false,
  }
}

export function applyCompanyDefaults(
  invoice: Invoice,
  company: Company,
  invoices: Invoice[],
  previousCompany?: Company,
): Invoice {
  const sender = { companyId: company.id, sender: company.sender }
  if (invoices.some(({ id }) => id === invoice.id)) return { ...invoice, ...sender }
  // Never reinterpret entered prices or money adjustments in the new company's currency.
  const hasPrices =
    invoice.items.some(({ rate }) => rate !== '') ||
    invoice.shipping !== '' ||
    (invoice.discountKind === 'fixed' && invoice.discount !== '')
  return {
    ...invoice,
    ...sender,
    number:
      !invoice.number || invoice.number === suggestInvoiceNumber(invoice, invoices, previousCompany)
        ? nextInvoiceNumber(company, invoices).number
        : invoice.number,
    currency: hasPrices ? invoice.currency : company.currency,
    taxLabel: company.taxLabel,
    taxRate: company.taxRate,
    notes: invoice.notes || company.notes,
    terms: invoice.terms || company.terms,
  }
}

export function duplicateInvoice(
  source: Invoice,
  company: Company | undefined,
  invoices: Invoice[],
  now = new Date(),
): Invoice {
  return {
    ...source,
    id: crypto.randomUUID(),
    status: 'draft',
    number: suggestInvoiceNumber(source, invoices, company),
    issueDate: localDate(now),
    dueDate: localDate(now, 14),
    items: source.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
    updatedAt: now.toISOString(),
  }
}

const thousands = 1000n
const percentBase = 100n * thousands
const decimalPattern = /^(-?)(?:(\d{1,9})(?:\.(\d{0,3}))?|\.(\d{1,3}))$/

function scaled(value: string): bigint | null {
  if (value === '') return 0n
  const match = decimalPattern.exec(value)
  if (!match) return null
  const [, sign, whole, fractionAfterWhole, fractionOnly] = match
  const n =
    BigInt(whole ?? '0') * thousands +
    BigInt((fractionAfterWhole ?? fractionOnly ?? '').padEnd(3, '0'))
  return sign === '-' ? -n : n
}

export function decimalValid(value: string, kind: 'quantity' | 'amount' | 'percent') {
  const parsed = scaled(value)
  return (
    parsed !== null &&
    (kind === 'quantity' || parsed >= 0n) &&
    (kind !== 'percent' || parsed <= percentBase)
  )
}

function legacyTemplateError(template: LegacyTemplate) {
  if (!template.name.trim()) return 'Enter a template name.'
  if (!template.items.length || template.items.some((item) => !item.description.trim()))
    return 'Add at least one line item and give each item a description.'
  if (
    template.items.some(
      (item) => !decimalValid(item.quantity, 'quantity') || !decimalValid(item.rate, 'amount'),
    )
  )
    return 'Correct the highlighted quantities or rates.'
  if (!unique(template.items.map((item) => item.id))) return 'Each template line must be unique.'
  return null
}

function productError(product: Product) {
  if (!product.name.trim()) return 'Enter a product name.'
  if (!product.description.trim()) return 'Enter an invoice line description.'
  if (!decimalValid(product.quantity, 'quantity') || !decimalValid(product.rate, 'amount'))
    return 'Correct the highlighted quantity or rate.'
  return null
}

export function saveProduct(
  workspace: Workspace,
  product: Product,
): { ok: true; data: Workspace } | { ok: false; message: string } {
  const normalized = { ...product, name: product.name.trim() }
  const error = productError(normalized)
  if (error) return { ok: false, message: error }
  if (!productSchema.safeParse(normalized).success)
    return { ok: false, message: 'The product exceeds the allowed field limits.' }
  const exists = workspace.products.some((entry) => entry.id === normalized.id)
  if (!exists && workspace.products.length >= maxProducts) {
    return { ok: false, message: 'Remove a product before saving a new one.' }
  }
  const products = exists
    ? workspace.products.map((entry) => (entry.id === normalized.id ? normalized : entry))
    : [...workspace.products, normalized]
  return { ok: true, data: { ...workspace, products } }
}

export function addProductLine(
  invoice: Invoice,
  product: Product,
): { ok: true; invoice: Invoice } | { ok: false; message: string } {
  if (invoice.currency !== product.currency) {
    return {
      ok: false,
      message: `This product uses ${product.currency}. Choose a ${invoice.currency} product or change the invoice currency first.`,
    }
  }
  const [first] = invoice.items
  const onlyPlaceholder =
    invoice.items.length === 1 &&
    first?.description === '' &&
    first.rate === '' &&
    ['', '1'].includes(first.quantity)
  const items = onlyPlaceholder ? [] : invoice.items
  if (items.length >= maxItems)
    return { ok: false, message: 'This invoice has no room for more line items.' }
  const { description, quantity, rate } = product
  return {
    ok: true,
    invoice: { ...invoice, items: [...items, { ...newItem(description), quantity, rate }] },
  }
}

export function invoiceError(invoice: Invoice) {
  if (
    !invoice.sender.name.trim() ||
    !invoice.client.name.trim() ||
    !invoice.number.trim() ||
    !invoice.issueDate
  ) {
    return 'Enter a sender, client, invoice number, and issue date.'
  }
  if (invoice.dueDate && invoice.dueDate < invoice.issueDate)
    return 'The due date must not precede the issue date.'
  if (!invoice.items.length || invoice.items.some((item) => !item.description.trim())) {
    return 'Add at least one line item and give each item a description.'
  }
  if (!invoiceTotals(invoice)) return 'Correct the highlighted numbers before continuing.'
  return null
}

export function companyError(company: Company) {
  if (!company.sender.name.trim()) return 'Enter a company name.'
  if (!decimalValid(company.taxRate, 'percent')) return 'Enter a tax rate between 0 and 100.'
  if (
    !Number.isInteger(company.nextNumber) ||
    !Number.isInteger(company.padding) ||
    company.nextNumber < 1 ||
    company.nextNumber > 1_000_001 ||
    company.padding < 1 ||
    company.padding > 8
  ) {
    return 'Enter a positive sequence number and a padding width from 1 to 8.'
  }
  return null
}

export function saveDraft(
  workspace: Workspace,
  now = new Date(),
): { ok: true; data: Workspace } | { ok: false; message: string } {
  const draft = {
    ...workspace.draft,
    number: workspace.draft.number.trim(),
    updatedAt: now.toISOString(),
  }
  const error = invoiceError(draft)
  if (error) return { ok: false, message: error }
  const existing = workspace.invoices.some((invoice) => invoice.id === draft.id)
  if (!existing && workspace.invoices.length >= maxInvoices) {
    return {
      ok: false,
      message: 'The local history is full. Export a backup and remove an invoice before saving.',
    }
  }
  if (
    workspace.invoices.some(
      (invoice) => invoice.id !== draft.id && numberKey(invoice) === numberKey(draft),
    )
  ) {
    return { ok: false, message: 'That invoice number is already used for this company.' }
  }
  const companies = existing
    ? workspace.companies
    : workspace.companies.map((company) => {
        if (company.id !== draft.companyId) return company
        const suggested = nextInvoiceNumber(company, workspace.invoices)
        return suggested.number.toLowerCase() === draft.number.toLowerCase()
          ? { ...company, nextNumber: suggested.sequence + 1 }
          : company
      })
  return {
    ok: true,
    data: {
      ...workspace,
      draft,
      dirty: false,
      companies,
      invoices: [draft, ...workspace.invoices.filter((invoice) => invoice.id !== draft.id)],
    },
  }
}

function rounded(numerator: bigint, denominator: bigint) {
  const absolute = numerator < 0n ? -numerator : numerator
  const result = (absolute + denominator / 2n) / denominator
  return numerator < 0n ? -result : result
}

function formatFor(currency: Currency, display: 'symbol' | 'code' = 'symbol') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: display })
}

function currencyScale(currency: Currency) {
  const digits = formatFor(currency).resolvedOptions().maximumFractionDigits ?? 2
  return { digits, factor: 10n ** BigInt(digits) }
}

export function formatMoney(
  minor: bigint,
  currency: Currency,
  display: 'symbol' | 'code' = 'symbol',
) {
  const { digits, factor } = currencyScale(currency)
  const whole = minor / factor
  const remainder = minor < 0n ? -(minor % factor) : minor % factor
  return formatFor(currency, display)
    .formatToParts(whole === 0n && minor < 0n ? -0 : whole)
    .map((part) =>
      part.type === 'fraction' ? String(remainder).padStart(digits, '0') : part.value,
    )
    .join('')
}

export function formatRate(value: string, currency: Currency) {
  const rate = scaled(value)
  if (rate === null || rate < 0n) return '—'
  // Show the input precision, even when a currency rounds line totals to fewer places.
  const fraction = value.split('.')[1]?.length ?? 0
  const digits = Math.max(fraction, currencyScale(currency).digits)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .formatToParts(rate / thousands)
    .map((part) =>
      part.type === 'fraction'
        ? String(rate % thousands)
            .padStart(3, '0')
            .slice(0, digits)
        : part.value,
    )
    .join('')
}

export function invoiceTotals(invoice: Invoice) {
  const { factor } = currencyScale(invoice.currency)
  const lines: bigint[] = []
  for (const item of invoice.items) {
    const quantity = scaled(item.quantity)
    const rate = scaled(item.rate)
    if (quantity === null || rate === null || rate < 0n) return null
    lines.push(rounded(quantity * rate * factor, thousands * thousands))
  }
  const discountValue = scaled(invoice.discount)
  const taxRate = scaled(invoice.taxRate)
  const shippingValue = scaled(invoice.shipping)
  if (
    discountValue === null ||
    discountValue < 0n ||
    taxRate === null ||
    taxRate < 0n ||
    taxRate > percentBase ||
    shippingValue === null ||
    shippingValue < 0n ||
    (invoice.discountKind === 'percent' && discountValue > percentBase)
  )
    return null
  const subtotal = lines.reduce((sum, line) => sum + line, 0n)
  const proposedDiscount =
    invoice.discountKind === 'percent'
      ? rounded(subtotal * discountValue, percentBase)
      : rounded(discountValue * factor, thousands)
  const discount = subtotal <= 0n ? 0n : proposedDiscount > subtotal ? subtotal : proposedDiscount
  const tax = rounded((subtotal - discount) * taxRate, percentBase)
  const shipping = rounded(shippingValue * factor, thousands)
  return { lines, subtotal, discount, tax, shipping, total: subtotal - discount + tax + shipping }
}

const dates = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export function formatDate(value: string) {
  return value ? dates.format(new Date(`${value}T00:00:00Z`)) : '—'
}

export function updateInvoiceStatus(
  workspace: Workspace,
  invoiceId: string,
  status: InvoiceStatus,
  now = new Date(),
): Workspace {
  const target = workspace.invoices.find((invoice) => invoice.id === invoiceId)
  if (!target) return workspace
  const updatedAt = now.toISOString()
  const invoices = workspace.invoices.map((invoice) =>
    invoice.id === invoiceId ? { ...invoice, status, updatedAt } : invoice,
  )
  const draft =
    workspace.draft.id === invoiceId && !workspace.dirty
      ? { ...workspace.draft, status, updatedAt }
      : workspace.draft
  return { ...workspace, invoices, draft }
}

export function formatBytes(bytes: number): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  if (safe < 1024) return `${Math.round(safe)} B`
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(1)} KB`
  return `${(safe / (1024 * 1024)).toFixed(2)} MB`
}
