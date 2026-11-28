import { z } from 'zod'
import { countryCodes, currencies } from './catalog'

const invoiceStatuses = ['draft', 'sent', 'paid'] as const
const themes = ['system', 'light', 'dark'] as const
export const defaultAccentColor = '#4837a6'
export const invoiceLayouts = ['classic', 'modern', 'minimal'] as const
export type InvoiceLayout = (typeof invoiceLayouts)[number]
export const invoiceLayoutLabels: Record<InvoiceLayout, string> = {
  classic: 'Classic',
  modern: 'Modern',
  minimal: 'Minimal',
}
export type InvoicePalette = {
  accent: string
  soft: string
  amountBg: string
  amountInk: string
  line: string
}
const invoiceThemes = ['indigo', 'slate', 'emerald', 'amber', 'rose'] as const
type InvoiceTheme = (typeof invoiceThemes)[number]
const invoiceThemePalettes: Record<InvoiceTheme, InvoicePalette> = {
  indigo: {
    accent: '#4837a6',
    soft: '#f0edf9',
    amountBg: '#f9e080',
    amountInk: '#282049',
    line: '#dedbe8',
  },
  slate: {
    accent: '#334155',
    soft: '#f1f5f9',
    amountBg: '#e2e8f0',
    amountInk: '#0f172a',
    line: '#cbd5e1',
  },
  emerald: {
    accent: '#047857',
    soft: '#ecfdf5',
    amountBg: '#a7f3d0',
    amountInk: '#064e3b',
    line: '#ccebd9',
  },
  amber: {
    accent: '#b45309',
    soft: '#fffbeb',
    amountBg: '#fde68a',
    amountInk: '#451a03',
    line: '#f3dec0',
  },
  rose: {
    accent: '#be123c',
    soft: '#fff1f2',
    amountBg: '#fecdd3',
    amountInk: '#4c0519',
    line: '#f3d1d6',
  },
}

const hexColorPattern = /^#[0-9a-fA-F]{6}$/

function parseHex(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

function mixHex(baseHex: string, targetHex: string, targetWeight: number) {
  const [r1, g1, b1] = parseHex(baseHex)
  const [r2, g2, b2] = parseHex(targetHex)
  const channel = (a: number, b: number) =>
    Math.round(a * (1 - targetWeight) + b * targetWeight)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA)
  const l2 = relativeLuminance(hexB)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function ensureContrast(hex: string, backgroundHex: string, minRatio = 4.5): string {
  if (contrastRatio(hex, backgroundHex) >= minRatio) return hex
  const target = relativeLuminance(backgroundHex) > 0.5 ? '#0f172a' : '#ffffff'
  let low = 0
  let high = 1
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2
    if (contrastRatio(mixHex(hex, target, mid), backgroundHex) >= minRatio) {
      high = mid
    } else {
      low = mid
    }
  }
  const candidate = mixHex(hex, target, high)
  return contrastRatio(candidate, backgroundHex) >= minRatio ? candidate : target
}

export function resolveAccentColor(invoice: Pick<Invoice, 'accentColor' | 'theme'>): string {
  if (invoice.accentColor && hexColorPattern.test(invoice.accentColor)) {
    return invoice.accentColor.toLowerCase()
  }
  return invoiceThemePalettes[invoice.theme ?? 'indigo'].accent
}

export function resolveInvoiceLayout(invoice: Pick<Invoice, 'layout'>): InvoiceLayout {
  return invoice.layout ?? 'classic'
}

export function deriveInvoicePalette(accentHex: string): InvoicePalette {
  const normalized = hexColorPattern.test(accentHex) ? accentHex.toLowerCase() : defaultAccentColor
  if (normalized === defaultAccentColor) return invoiceThemePalettes.indigo
  const amountBg = mixHex(normalized, '#ffffff', 0.78)
  return {
    accent: ensureContrast(normalized, '#ffffff', 4.5),
    soft: mixHex(normalized, '#ffffff', 0.92),
    amountBg,
    amountInk: ensureContrast(mixHex(normalized, '#0f172a', 0.76), amountBg, 4.5),
    line: mixHex(normalized, '#ffffff', 0.8),
  }
}

export function resolveInvoicePalette(
  invoice: Pick<Invoice, 'accentColor' | 'theme'>,
): InvoicePalette {
  return deriveInvoicePalette(resolveAccentColor(invoice))
}
export const maxItems = 100
export const maxInvoices = 500
export const maxCompanies = 50
const legacyTemplateLimit = 50
export const maxProducts = legacyTemplateLimit * maxItems
export const maxBackupBytes = 8 * 1024 * 1024
export const maxLogoBytes = 256 * 1024
const currencySchema = z.enum(currencies)
export type Currency = z.infer<typeof currencySchema>

const id = z.uuid()

function hasUnsafeChars(value: string, allowNewlines: boolean) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (allowNewlines && (code === 0x0a || code === 0x0d || code === 0x09)) continue
    if (code < 0x20 || code === 0x7f) return true
    if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) return true
  }
  return false
}

const singleLineText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !hasUnsafeChars(value, false))
const label = singleLineText(120)
const memo = z
  .string()
  .max(1500)
  .refine((value) => !hasUnsafeChars(value, true))
const decimalInput = z.string().max(16)
const dateInput = z.union([z.iso.date(), z.literal('')])
const country = z.string().refine((code) => code === '' || countryCodes.includes(code))
const logo = z
  .string()
  .max(Math.ceil(maxLogoBytes / 3) * 4 + 32)
  .regex(
    /^(?:data:image\/png;base64,iVBORw0KGgo|data:image\/jpeg;base64,\/9j\/)[A-Za-z0-9+/]+={0,2}$/,
  )
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
  prefix: singleLineText(24),
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
  description: singleLineText(240),
  quantity: decimalInput,
  rate: decimalInput,
})
const productSchema = z.strictObject({
  id,
  name: label,
  currency: currencySchema,
  items: z.array(itemSchema).min(1).max(maxItems),
})
const singleProductSchema = itemSchema.extend({ name: label, currency: currencySchema })
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
    theme: z.enum(invoiceThemes).optional(),
    accentColor: z.string().regex(hexColorPattern).optional(),
    layout: z.enum(invoiceLayouts).optional(),
    updatedAt: z.iso.datetime(),
  })
  .refine((invoice) => unique(invoice.items.map((item) => item.id)))

export type Contact = z.infer<typeof contactSchema>
export type Sender = z.infer<typeof senderSchema>
export type Company = z.infer<typeof companySchema>
export type LineItem = z.infer<typeof itemSchema>
export type Product = z.infer<typeof productSchema>
export type Invoice = z.infer<typeof invoiceSchema>
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
    templates: z.array(productSchema).max(legacyTemplateLimit),
  })
  .refine(({ templates }) =>
    unique(templates.map(({ currency, name }) => `${currency}:${name.trim().toLowerCase()}`)),
  )
const workspaceV3 = workspaceV1.extend({
  version: z.literal(3),
  products: z.array(singleProductSchema).max(maxProducts),
})
const workspaceV4 = workspaceV1.omit({ draft: true, dirty: true }).extend({
  version: z.literal(4),
  products: z.array(productSchema).max(maxProducts),
})

// Old drafts are deliberately not restored; only explicitly saved records are kept.
export const workspaceSchema = z
  .discriminatedUnion('version', [workspaceV1, workspaceV2, workspaceV3, workspaceV4])
  .transform((workspace): z.infer<typeof workspaceV4> => {
    if (workspace.version === 4) return workspace
    const { companies, invoices, theme } = workspace
    const products =
      workspace.version === 2
        ? workspace.templates
        : workspace.version === 3
          ? workspace.products.map(({ id, name, currency, ...line }) => ({
              id,
              name,
              currency,
              items: [{ id, ...line }],
            }))
          : []
    return { version: 4, companies, invoices, theme, products }
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

const blankContact: Contact = { name: '', email: '', phone: '', address: '', country: '' }
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
  return { id: crypto.randomUUID(), name: '', currency, items: [newItem()] }
}

export function matchesProduct(product: Product, search: string) {
  return [product.name, product.currency, ...product.items.map((item) => item.description)].some(
    (value) => value.toLowerCase().includes(search),
  )
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

function nextInvoiceNumber(company: Company, invoices: Invoice[]) {
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
    issueDate: localDate(now),
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
    version: 4,
    theme: 'system',
    companies: [],
    invoices: [],
    products: [],
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

export function hasPositiveDecimal(value: string): boolean {
  const parsed = scaled(value)
  return parsed !== null && parsed > 0n
}

export function sanitizeFilename(value: string, fallback = 'invoice'): string {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 100)
    .replace(/^[.-]+|[.-]+$/g, '')
  return cleaned || fallback
}

export function backupFilename(now = new Date()): string {
  return `invoice-core-backup-${localDate(now)}.json`
}

function productError(product: Product) {
  if (!product.name.trim()) return 'Enter a product name.'
  if (!product.items.length || product.items.some((item) => !item.description.trim()))
    return 'Add at least one item and give each item a description.'
  if (
    product.items.some(
      (item) => !decimalValid(item.quantity, 'quantity') || !decimalValid(item.rate, 'amount'),
    )
  )
    return 'Correct the highlighted quantities or rates.'
  if (!unique(product.items.map((item) => item.id))) return 'Each line item must have a unique ID.'
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

export function addProductLines(
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
  if (items.length + product.items.length > maxItems)
    return {
      ok: false,
      message: `This product has ${product.items.length} line item(s), but only ${maxItems - items.length} can fit on the invoice.`,
    }
  return {
    ok: true,
    invoice: {
      ...invoice,
      items: [...items, ...product.items.map((item) => ({ ...item, id: crypto.randomUUID() }))],
    },
  }
}

function invoiceError(invoice: Invoice) {
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

function companyError(company: Company) {
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

export function saveCompany(
  workspace: Workspace,
  company: Company,
): { ok: true; data: Workspace } | { ok: false; message: string } {
  const error = companyError(company)
  if (error) return { ok: false, message: error }
  if (!companySchema.safeParse(company).success) {
    return {
      ok: false,
      message: 'Some company fields are invalid. Check the entries and try again.',
    }
  }
  const exists = workspace.companies.some((entry) => entry.id === company.id)
  if (!exists && workspace.companies.length >= maxCompanies) {
    return { ok: false, message: 'Remove a company before saving a new one.' }
  }
  const companies = exists
    ? workspace.companies.map((entry) => (entry.id === company.id ? company : entry))
    : [...workspace.companies, company]
  return { ok: true, data: { ...workspace, companies } }
}

export function saveInvoice(
  workspace: Workspace,
  invoice: Invoice,
  now = new Date(),
): { ok: true; data: Workspace } | { ok: false; message: string } {
  const draft = {
    ...invoice,
    number: invoice.number.trim(),
    updatedAt: now.toISOString(),
  }
  const error = invoiceError(draft)
  if (error) return { ok: false, message: error }
  if (!invoiceSchema.safeParse(draft).success)
    return {
      ok: false,
      message: 'Some invoice fields are invalid. Check the entries and try again.',
    }
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

export function formatBytes(bytes: number): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  if (safe < 1024) return `${Math.round(safe)} B`
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(1)} KB`
  return `${(safe / (1024 * 1024)).toFixed(2)} MB`
}
