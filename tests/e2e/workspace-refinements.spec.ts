import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  newCompany,
  newInvoice,
  newItem,
  newProduct,
  newWorkspace,
} from '../../src/modules/invoice/domain/invoice'
import { storageKey } from '../../src/modules/invoice/workspace.browser'

test('sorts history by descending issue date and resets pagination after searching', async ({
  page,
}) => {
  const company = newCompany('North Studio')
  const invoices = Array.from({ length: 12 }, (_, index) => {
    const draft = newInvoice(company, [])
    return {
      ...draft,
      number: `NORTH-${index + 1}`,
      client: { ...draft.client, name: `Account ${index + 1}` },
      issueDate: `2026-10-${String(index + 1).padStart(2, '0')}`,
      dueDate: '',
      items: [newItem('Consulting')],
      status: index === 11 ? 'paid' : 'sent',
    }
  })
  const data = { ...newWorkspace(), companies: [company], invoices }
  await page.addInitScript(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(data),
  })
  await page.goto('/')
  const rows = page.getByRole('region', { name: 'Invoice history' }).getByRole('listitem')
  await expect(rows).toHaveCount(10)
  await expect(rows.first()).toContainText('NORTH-12')
  await expect(rows.last()).toContainText('NORTH-3')
  await expect(page.getByRole('combobox', { name: /status/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('NORTH-2')
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByRole('searchbox', { name: 'Search invoices' }).fill('Account 12')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('NORTH-12')
  await expect(page.getByRole('navigation', { name: 'Invoice history pages' })).toHaveCount(0)
})

test('uses full-width catalog tabs with searchable panels', async ({ page }, info) => {
  const product = {
    ...newProduct('USD'),
    name: 'Design retainer',
    items: [{ ...newItem('Design'), rate: '45' }],
  }
  const data = { ...newWorkspace(), companies: [newCompany('North Studio')], products: [product] }
  await page.addInitScript(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(data),
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/#companies')
  const productsTab = page.getByRole('tab', { name: 'Products', exact: true })
  const companiesTab = page.getByRole('tab', { name: 'Companies', exact: true })
  const companies = page.getByRole('region', { name: 'Companies', exact: true })
  const products = page.getByRole('region', { name: 'Products', exact: true })

  await expect(companiesTab).toHaveAttribute('aria-selected', 'true')
  await expect(companies.getByText('North Studio', { exact: true })).toBeVisible()
  await expect(products).toHaveCount(0)
  const shellWidth = (await page.locator('main.ic-shell').boundingBox())?.width ?? 0
  expect((await companies.boundingBox())?.width ?? 0).toBeGreaterThan(shellWidth * 0.9)
  const companySearch = companies.getByRole('searchbox', { name: 'Search companies' })
  await companySearch.fill('missing company')
  await expect(companies.getByText('No companies match this search.')).toBeVisible()
  await companySearch.clear()

  await productsTab.click()
  await expect(productsTab).toHaveAttribute('aria-selected', 'true')
  await expect(products.getByText('Design retainer', { exact: true })).toBeVisible()
  await expect(companies).toHaveCount(0)
  expect((await products.boundingBox())?.width ?? 0).toBeGreaterThan(shellWidth * 0.9)
  await page.screenshot({ path: info.outputPath('catalog-desktop.png'), fullPage: true })
  const productSearch = products.getByRole('searchbox', { name: 'Search products' })
  await productSearch.fill('missing product')
  await expect(products.getByText('No products match this search.')).toBeVisible()
  await productSearch.clear()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('catalog-mobile.png'), fullPage: true })
})

test('downloads an incomplete preview without saving it to history', async ({ page }, info) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice' }).click()
  const form = page.getByRole('region', { name: 'Edit invoice' })
  const save = form.getByRole('button', { name: 'Create invoice' })
  const number = form.getByLabel('Invoice number')
  await expect(number).toHaveValue('INV-0001')
  await expect(form.getByRole('button', { name: 'Generate' })).toHaveCount(0)
  await number.fill('CUSTOM-01')
  await form.getByRole('button', { name: 'Remove item 1' }).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const preview = page.getByRole('region', { name: 'Document preview' })
  await expect(preview.getByRole('cell', { name: 'No line items', exact: true })).toBeVisible()
  const pending = page.waitForEvent('download')
  await preview.getByRole('button', { name: 'Download PDF' }).click()
  const pdf = await pending
  expect(pdf.suggestedFilename()).toBe('CUSTOM-01.pdf')
  expect((await readFile(await pdf.path())).subarray(0, 5).toString()).toBe('%PDF-')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await save.click()
  await expect(form.getByRole('alert')).toContainText('Enter a sender, client')
  await expect(form.getByRole('button', { name: 'Reset draft' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('editor-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Back to invoices' }).click()
  await expect(page.getByRole('heading', { name: 'No saved invoices yet' })).toBeVisible()
})

test('edits one invoice sheet and uses the footer space without overflowing on mobile', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.goto('/')
  const create = page.getByRole('button', { name: 'Create invoice', exact: true })
  await create.click()
  const edit = page.getByRole('article', { name: 'Editable invoice' })
  const preview = page.getByRole('article', { name: 'Invoice document' })
  const editToggle = page.getByRole('button', { name: 'Edit', exact: true })
  const previewToggle = page.getByRole('button', { name: 'Preview', exact: true })
  await edit.getByLabel('Invoice number').fill('EXAMPLE-001')
  await edit.getByLabel('Sender name').fill('Northline Studio')
  await edit.getByRole('textbox', { name: 'Client', exact: true }).fill('Fieldwork Press')
  await edit.getByLabel('Description, item 1').fill('Editorial design')
  await expect(edit.getByLabel('Sender name')).toHaveValue('Northline Studio')
  await expect(edit.getByLabel('Invoice number')).toHaveValue('EXAMPLE-001')
  await expect(edit.getByLabel('Description, item 1')).toHaveValue('Editorial design')
  await expect(preview).toHaveCount(0)

  await previewToggle.press('Enter')
  await expect(edit).toHaveCount(0)
  await expect(preview.getByRole('heading', { name: 'Payment details' })).toHaveCount(0)
  await expect(preview.getByRole('heading', { name: 'Terms' })).toHaveCount(0)
  await editToggle.press('Enter')
  const notes = edit.getByRole('textbox', { name: 'Notes', exact: true })
  const terms = edit.getByRole('textbox', { name: 'Terms', exact: true })
  const payment = edit.getByRole('textbox', { name: 'Payment details', exact: true })
  await notes.fill('Thank you for working with us.')
  await terms.fill('Due within 14 days.')
  await payment.fill('Example Bank\nReference EXAMPLE-001')

  const desktop = await notes.boundingBox()
  const desktopTerms = await terms.boundingBox()
  const desktopPayment = await payment.boundingBox()
  if (!desktop || !desktopTerms || !desktopPayment) throw new Error('Expected the footer inputs')
  expect(desktopTerms.y).toBe(desktop.y)
  expect(desktopTerms.x).toBeGreaterThan(desktop.x)
  expect(desktopPayment.y).toBeGreaterThan(desktop.y)
  expect(desktopPayment.width).toBeGreaterThan(desktop.width + desktopTerms.width)
  await page.screenshot({ path: info.outputPath('inline-invoice-desktop.png'), fullPage: true })

  await page.setViewportSize({ width: 320, height: 800 })
  const mobile = await notes.boundingBox()
  const mobileTerms = await terms.boundingBox()
  const mobilePayment = await payment.boundingBox()
  if (!mobile || !mobileTerms || !mobilePayment)
    throw new Error('Expected the mobile footer inputs')
  expect(mobileTerms.x).toBe(mobile.x)
  expect(mobileTerms.y).toBeGreaterThan(mobile.y)
  expect(mobilePayment.y).toBeGreaterThan(mobileTerms.y)
  const table = edit.getByRole('table', { name: 'Invoice line items', exact: true })
  const description = await table
    .getByRole('textbox', { name: 'Description, item 1' })
    .boundingBox()
  const quantity = await table.getByRole('textbox', { name: 'Quantity, item 1' }).boundingBox()
  if (!description || !quantity) throw new Error('Expected the mobile line item inputs')
  expect(description.width).toBeGreaterThan(mobile.width * 0.95)
  expect(quantity.y).toBeGreaterThan(description.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.screenshot({ path: info.outputPath('inline-invoice-mobile.png'), fullPage: true })
  await previewToggle.click()
  await expect(preview.getByText('Thank you for working with us.')).toBeVisible()
  await expect(preview.getByText('Due within 14 days.')).toBeVisible()
  await expect(preview.getByText('Example Bank', { exact: false })).toBeVisible()
  await expect(edit).toHaveCount(0)
  await editToggle.click()
  await page.emulateMedia({ media: 'print' })
  await expect(edit).toHaveCount(0)
  await expect(preview.getByText('Due within 14 days.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0)
  await page.emulateMedia({ media: 'screen' })
  await create.click()
  await page.getByRole('button', { name: 'EXAMPLE-001', exact: true }).click()
  await expect(terms).toHaveValue('Due within 14 days.')
  await expect(payment).toHaveValue('Example Bank\nReference EXAMPLE-001')
})

test.describe('text sheet and local date', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })

  test('starts with the local day, keeps lookups off the sheet, and updates the logo in place', async ({
    page,
  }, info) => {
    await page.clock.setFixedTime(new Date('2026-11-25T02:00:00Z'))
    await page.goto('/')
    const create = page.getByRole('button', { name: 'Create invoice', exact: true })
    await create.click()
    const sheet = page.getByRole('article', { name: 'Editable invoice' })
    const options = page.getByRole('region', { name: 'Invoice options' })
    await expect(options.getByRole('combobox')).toHaveCount(4)
    await expect(options.getByRole('button', { name: /Accent color/i })).toHaveCount(0)
    await expect(options.getByRole('combobox', { name: 'Layout' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Accent color/i })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Layout' })).toBeVisible()
    await expect(sheet.getByRole('combobox')).toHaveCount(0)
    await expect(sheet.getByLabel('Invoice number')).toHaveValue('INV-0001')
    await expect(sheet.getByLabel('Issue date')).toHaveValue('2026-11-24')
    await expect(sheet.getByLabel('Due date')).toHaveValue('')
    const name = sheet.getByRole('textbox', { name: 'Sender name' })
    await expect(name).toHaveValue('')
    await expect(name).toHaveAttribute('placeholder', 'e.g. Northline Studio')
    await expect(name).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await page.screenshot({ path: info.outputPath('empty-text-sheet-desktop.png'), fullPage: true })

    const upload = sheet.getByLabel('Upload logo', { exact: true })
    await upload.focus()
    await page.keyboard.press('Tab')
    await expect(sheet.getByLabel('Invoice number')).toBeFocused()
    await upload.setInputFiles('public/invoice-192.png')
    const image = sheet.getByRole('img', { name: 'Invoice logo' })
    await expect(image).toBeVisible()
    const firstLogo = await image.getAttribute('src')
    const change = sheet.getByLabel('Change logo', { exact: true })
    await change.setInputFiles({
      name: 'invalid.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    })
    await expect(sheet.getByRole('alert')).toContainText('Choose a valid PNG or JPEG')
    await expect(image).toHaveAttribute('src', firstLogo ?? '')
    await change.setInputFiles('public/invoice-512.png')
    await expect(sheet.getByRole('alert')).toHaveCount(0)
    await expect(image).not.toHaveAttribute('src', firstLogo ?? '')
    const editedLogo = await image.getAttribute('src')

    await name.fill('Synthetic Studio')
    await sheet.getByRole('textbox', { name: 'Client', exact: true }).fill('Synthetic Client')
    await sheet.getByLabel('Description, item 1').fill('Synthetic work')
    await sheet.getByLabel('Issue date').fill('2026-11-22')
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    const preview = page.getByRole('article', { name: 'Invoice document' })
    await expect(options).toHaveCount(0)
    await expect(preview.locator('img')).toHaveAttribute('src', editedLogo ?? '')
    await expect(preview.getByText('Nov 22, 2026')).toBeVisible()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await create.click()
    await page.getByRole('button', { name: 'INV-0001', exact: true }).click()
    await expect(sheet.getByLabel('Issue date')).toHaveValue('2026-11-22')
    await expect(image).toHaveAttribute('src', editedLogo ?? '')
    await sheet.getByRole('button', { name: 'Remove logo' }).click()
    await expect(upload).toBeFocused()
    await expect(image).toHaveCount(0)
  })
})

test('never resumes or backs up an unsaved form and always creates a fresh invoice', async ({
  page,
}) => {
  await page.goto('/')
  const create = page.getByRole('button', { name: 'Create invoice', exact: true })
  const client = page.getByRole('textbox', { name: 'Client', exact: true })
  await create.click()
  await client.fill('Fieldwork Press')
  await expect(client).toHaveValue('Fieldwork Press')
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull()
  await page.reload()
  await expect(client).toHaveValue('')
  await page.getByLabel('Description, item 1').fill('Unsaved service')
  await page.getByRole('button', { name: 'Back to invoices' }).click()
  await expect(page.getByRole('button', { name: 'Resume draft' })).toHaveCount(0)
  await create.click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByLabel('Description, item 1')).toHaveValue('')
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0001')
  await page.getByRole('button', { name: 'Back to invoices' }).click()
  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const backup = JSON.parse(await readFile(await (await pending).path(), 'utf8'))
  expect(backup).toEqual({ version: 4, companies: [], invoices: [], products: [], theme: 'system' })
})
