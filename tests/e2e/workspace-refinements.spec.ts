import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  newCompany,
  newInvoice,
  newItem,
  newProduct,
  newWorkspace,
  saveInvoice,
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

test('uses full-width workspace tabs with searchable panels', async ({ page }, info) => {
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
  await expect(page.getByRole('navigation', { name: 'Workspace' })).toHaveCount(0)
  const tablist = page.getByRole('tablist', { name: 'Workspace sections' })
  await expect(tablist.getByRole('tab')).toHaveText(['Invoices', 'Products', 'Companies'])
  const invoicesTab = tablist.getByRole('tab', { name: 'Invoices', exact: true })
  const productsTab = tablist.getByRole('tab', { name: 'Products', exact: true })
  const companiesTab = tablist.getByRole('tab', { name: 'Companies', exact: true })
  const companies = page.getByRole('region', { name: 'Companies', exact: true })
  const products = page.getByRole('region', { name: 'Products', exact: true })

  await expect(companiesTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Backup', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create invoice', exact: true })).toBeVisible()
  await expect(companies.getByText('North Studio', { exact: true })).toBeVisible()
  await expect(products).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
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
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('workspace-tabs-desktop.png'), fullPage: true })
  const productSearch = products.getByRole('searchbox', { name: 'Search products' })
  await productSearch.fill('missing product')
  await expect(products.getByText('No products match this search.')).toBeVisible()
  await productSearch.clear()

  await invoicesTab.click()
  await expect(invoicesTab).toHaveAttribute('aria-selected', 'true')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: info.outputPath('workspace-tabs-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
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
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
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
    await expect(options.getByRole('combobox')).toHaveCount(2)
    await expect(options.getByLabel('Accent color')).toHaveCount(0)
    await expect(options.getByRole('combobox', { name: 'Layout' })).toHaveCount(0)
    await expect(page.getByLabel('Accent color')).toBeVisible()
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
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await create.click()
  await expect(client).toHaveValue('')
  await page.getByLabel('Description, item 1').fill('Unsaved service')
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Resume draft' })).toHaveCount(0)
  await create.click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByLabel('Description, item 1')).toHaveValue('')
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0001')
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const backup = JSON.parse(await readFile(await (await pending).path(), 'utf8'))
  expect(backup).toEqual({ version: 4, companies: [], invoices: [], products: [], theme: 'system' })
})

test('aligns invoice sheet action buttons cleanly across mobile states', async ({ page }, info) => {
  const box = async (locator: ReturnType<typeof page.locator>) => {
    const rect = await locator.boundingBox()
    if (!rect) throw new Error('Expected visible element bounding box')
    return rect
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()

  const stage = page.getByRole('region', { name: 'Edit invoice' })
  const sheet = page.locator('#invoice-editor')
  const createBtn = stage.getByRole('button', { name: 'Create invoice', exact: true })
  const downloadBtn = stage.getByRole('button', { name: 'Download PDF', exact: true })

  // 1. Unedited new draft: Create invoice & Download PDF stack full width flush with sheet
  const sheetBox = await box(sheet)
  const createUnedited = await box(createBtn)
  const downloadUnedited = await box(downloadBtn)
  expect(Math.abs(createUnedited.x - sheetBox.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(createUnedited.width - sheetBox.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(downloadUnedited.x - sheetBox.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(downloadUnedited.width - sheetBox.width)).toBeLessThanOrEqual(2)
  expect(downloadUnedited.y).toBeGreaterThan(createUnedited.y + createUnedited.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)

  // 2. Edited new draft: Create invoice + Reset draft equal 50/50 row 1, Download PDF full row 2
  await sheet.getByLabel('Sender name').fill('Northline Studio')
  await sheet.getByRole('textbox', { name: 'Client', exact: true }).fill('Fieldwork Press')
  await sheet.getByLabel('Description, item 1').fill('Product design sprint')

  const resetBtn = stage.getByRole('button', { name: 'Reset draft', exact: true })
  const createEdited = await box(createBtn)
  const resetEdited = await box(resetBtn)
  const downloadEdited = await box(downloadBtn)
  const sheetEdited = await box(sheet)
  expect(Math.abs(createEdited.y - resetEdited.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(createEdited.width - resetEdited.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(createEdited.height - resetEdited.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(createEdited.x - sheetEdited.x)).toBeLessThanOrEqual(2)
  expect(
    Math.abs(resetEdited.x + resetEdited.width - (sheetEdited.x + sheetEdited.width)),
  ).toBeLessThanOrEqual(2)
  expect(Math.abs(downloadEdited.x - sheetEdited.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(downloadEdited.width - sheetEdited.width)).toBeLessThanOrEqual(2)
  expect(downloadEdited.y).toBeGreaterThan(createEdited.y + createEdited.height)
  await page.locator('.ic-invoice-stage').screenshot({
    path: info.outputPath('mobile-actions-draft.png'),
  })

  // Check 320px narrow mobile width for zero horizontal overflow
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  const dialog320 = await box(page.locator('.ic-workspace-dialog-wide'))
  expect(dialog320.x).toBeGreaterThanOrEqual(0)
  expect(dialog320.x + dialog320.width).toBeLessThanOrEqual(320)
  const createNarrow = await box(createBtn)
  const resetNarrow = await box(resetBtn)
  expect(Math.abs(createNarrow.y - resetNarrow.y)).toBeLessThanOrEqual(1)

  // 3. Saved invoice (390px): Save changes full row 1, Duplicate + Delete 50/50 row 2, Download PDF full row 3
  await page.setViewportSize({ width: 390, height: 844 })
  await createBtn.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'INV-0001', exact: true }).click()

  const saveBtn = stage.getByRole('button', { name: 'Save changes', exact: true })
  const duplicateBtn = stage.getByRole('button', { name: 'Duplicate', exact: true })
  const deleteBtn = stage.getByRole('button', { name: 'Delete', exact: true })
  const sheetSaved = await box(sheet)
  const saveBox = await box(saveBtn)
  const dupBox = await box(duplicateBtn)
  const delBox = await box(deleteBtn)
  const downloadSaved = await box(downloadBtn)

  expect(Math.abs(saveBox.x - sheetSaved.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(saveBox.width - sheetSaved.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(dupBox.y - delBox.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(dupBox.width - delBox.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(dupBox.height - delBox.height)).toBeLessThanOrEqual(1)
  expect(dupBox.height).toBeGreaterThanOrEqual(42)
  expect(Math.abs(dupBox.x - sheetSaved.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(delBox.x + delBox.width - (sheetSaved.x + sheetSaved.width))).toBeLessThanOrEqual(
    2,
  )
  expect(dupBox.y).toBeGreaterThan(saveBox.y + saveBox.height)
  expect(downloadSaved.y).toBeGreaterThan(dupBox.y + dupBox.height)
  expect(Math.abs(downloadSaved.width - sheetSaved.width)).toBeLessThanOrEqual(2)
  await page.locator('.ic-invoice-stage').screenshot({
    path: info.outputPath('mobile-actions-saved.png'),
  })

  // 4. Preview mode (390px): Download PDF spans full preview card width
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const previewStage = page.getByRole('region', { name: 'Document preview' })
  const previewCard = page.locator('#invoice-preview')
  const previewBox = await box(previewCard)
  const downloadPreview = await box(
    previewStage.getByRole('button', { name: 'Download PDF', exact: true }),
  )
  expect(Math.abs(downloadPreview.x - previewBox.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(downloadPreview.width - previewBox.width)).toBeLessThanOrEqual(2)
  await page.locator('.ic-invoice-stage').screenshot({
    path: info.outputPath('mobile-actions-preview.png'),
  })
})

test('opens invoices in a modal from Create, row click, Edit, and Duplicate without triggering row actions', async ({
  page,
}, info) => {
  const company = { ...newCompany('Northline Studio'), padding: 8 }
  const firstDraft = newInvoice(company, [])
  const firstResult = saveInvoice(
    { ...newWorkspace(), companies: [company] },
    {
      ...firstDraft,
      number: 'INV-00000001',
      issueDate: '2026-11-23',
      client: { ...firstDraft.client, name: 'Client Alpha' },
      items: [{ ...newItem('Design sprint'), rate: '1200' }],
    },
  )
  if (!firstResult.ok) throw new Error(firstResult.message)

  const secondDraft = newInvoice(company, firstResult.data.invoices)
  const secondResult = saveInvoice(firstResult.data, {
    ...secondDraft,
    number: 'INV-00000002',
    issueDate: '2026-11-24',
    client: { ...secondDraft.client, name: 'Client Beta' },
    items: [{ ...newItem('Engineering retainer'), rate: '2500' }],
  })
  if (!secondResult.ok) throw new Error(secondResult.message)

  await page.addInitScript(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(secondResult.data),
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  const history = page.getByRole('region', { name: 'Invoice history' })
  const rows = history.getByRole('listitem')
  await expect(rows).toHaveCount(2)
  await expect(rows.first().locator('.ic-actions button')).toHaveText([
    'PDF',
    'Edit',
    'Duplicate',
    'Delete',
  ])
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('invoices-list-desktop.png') })

  // 1. Create invoice opens New invoice modal over the Invoices page and closes on Escape
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const newDialog = page.getByRole('dialog', { name: 'New invoice' })
  await expect(newDialog).toBeVisible()
  await expect(page).toHaveURL('/')
  const newClose = newDialog.getByRole('button', { name: 'Close dialog' })
  const newCloseBox = await newClose.boundingBox()
  if (!newCloseBox) throw new Error('Expected visible modal close button')
  expect(Math.abs(newCloseBox.width - newCloseBox.height)).toBeLessThanOrEqual(1)
  expect(newCloseBox.width).toBeCloseTo(36, 0)
  expect(newCloseBox.height).toBeCloseTo(36, 0)
  await newClose.hover()
  await newDialog
    .locator('.ic-dialog-heading')
    .screenshot({ path: info.outputPath('modal-close-hover.png') })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Backup dialog close button also renders as a 36x36 square
  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const backupDialog = page.getByRole('dialog', { name: 'Backup' })
  await expect(backupDialog).toBeVisible()
  const backupClose = backupDialog.getByRole('button', { name: 'Close dialog' })
  await expect(backupDialog).not.toHaveAttribute('data-starting-style')
  await expect
    .poll(async () => {
      const box = await backupClose.boundingBox()
      return box ? Math.round(box.width) : 0
    })
    .toBe(36)
  const backupCloseBox = await backupClose.boundingBox()
  if (!backupCloseBox) throw new Error('Expected visible Backup close button')
  expect(Math.abs(backupCloseBox.width - backupCloseBox.height)).toBeLessThanOrEqual(1)
  expect(backupCloseBox.height).toBeCloseTo(36, 0)
  await backupClose.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // 2. Clicking client name on a row opens Invoice details modal
  await rows
    .filter({ hasText: 'INV-00000001' })
    .getByRole('heading', { name: 'Client Alpha' })
    .click()
  const detailsDialog = page.getByRole('dialog', { name: 'Invoice details' })
  await expect(detailsDialog).toBeVisible()
  await expect(detailsDialog.getByLabel('Invoice number')).toHaveValue('INV-00000001')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('invoice-modal-desktop.png') })
  await detailsDialog.getByRole('button', { name: 'Preview', exact: true }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await detailsDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // 3. Clicking total amount on a row opens Invoice details modal
  await rows.filter({ hasText: 'INV-00000002' }).locator('.ic-record-total').click()
  await expect(detailsDialog).toBeVisible()
  await expect(detailsDialog.getByLabel('Invoice number')).toHaveValue('INV-00000002')
  await detailsDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // 4. Clicking Edit button beside Duplicate opens Invoice details modal; Duplicate inside switches to New invoice
  await page.getByRole('button', { name: 'Edit INV-00000001', exact: true }).click()
  await expect(detailsDialog).toBeVisible()
  await expect(detailsDialog.getByLabel('Invoice number')).toHaveValue('INV-00000001')
  await detailsDialog.getByRole('button', { name: 'Duplicate', exact: true }).click()
  await expect(newDialog).toBeVisible()
  await expect(newDialog.getByLabel('Invoice number')).toHaveValue('INV-00000003')
  await expect(newDialog.getByRole('textbox', { name: 'Client', exact: true })).toHaveValue(
    'Client Alpha',
  )
  await newDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(rows).toHaveCount(2)

  // 5. Row Duplicate button opens New invoice modal directly
  await page.getByRole('button', { name: 'Duplicate INV-00000001', exact: true }).click()
  await expect(newDialog).toBeVisible()
  await expect(newDialog.getByLabel('Invoice number')).toHaveValue('INV-00000003')
  await newDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // 6. Row PDF button downloads PDF without opening detail modal
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF for INV-00000001', exact: true }).click()
  const pdfFile = await pdfDownload
  expect(pdfFile.suggestedFilename()).toBe('INV-00000001.pdf')
  expect((await readFile(await pdfFile.path())).subarray(0, 5).toString()).toBe('%PDF-')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // 7. Row Delete button opens confirmation without opening detail modal
  await page.getByRole('button', { name: 'Delete INV-00000002', exact: true }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete invoice INV-00000002?' })
  await expect(confirm).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(confirm).toHaveCount(0)
  await expect(rows).toHaveCount(2)

  // 8. Delete inside Invoice details modal uses nested confirmation; Cancel keeps modal, Confirm deletes & closes
  await page.getByRole('button', { name: 'Edit INV-00000002', exact: true }).click()
  await expect(detailsDialog).toBeVisible()
  await detailsDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(confirm).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(confirm).toHaveCount(0)
  await expect(detailsDialog).toBeVisible()
  await detailsDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await confirm.getByRole('button', { name: 'Delete invoice', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Invoice deleted.')
  await expect(rows).toHaveCount(1)

  // 9. Mobile viewport opens row detail modal with zero horizontal overflow
  await page.setViewportSize({ width: 390, height: 844 })
  await rows.first().getByRole('heading', { name: 'Client Alpha' }).click()
  await expect(detailsDialog).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: info.outputPath('invoice-modal-mobile.png') })
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await detailsDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('keeps fixed-amount discount currency unit on one line in summary', async ({ page }, info) => {
  const singleLineText = (element: Element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const first = walker.nextNode()
    let last = first
    while (walker.nextNode()) last = walker.currentNode
    if (!first || !last) return false
    const range = document.createRange()
    range.setStart(first, 0)
    range.setEnd(last, last.textContent?.length ?? 0)
    return range.getClientRects().length === 1
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('Description, item 1').fill('Design sprint')
  await dialog.getByLabel('Rate, item 1').fill('1000')
  await dialog.locator('details.ic-detail summary').click()
  await dialog.getByRole('combobox', { name: 'Discount type', exact: true }).click()
  await page.getByRole('option', { name: 'Fixed amount', exact: true }).click()

  const discountInput = dialog.getByLabel('Discount amount', { exact: true })
  await discountInput.fill('250')
  await expect(dialog.locator('#invoice-editor .ic-amount dd')).toHaveText('$750.00')

  const discountUnit = dialog.locator('.ic-summary-input-row').first().locator('.ic-summary-unit')
  await expect(discountUnit).toHaveText('USD')
  expect(await discountUnit.evaluate(singleLineText)).toBe(true)

  const discountRowBox = await dialog.locator('.ic-summary-input-row').nth(0).boundingBox()
  const taxRowBox = await dialog.locator('.ic-summary-input-row').nth(1).boundingBox()
  if (!discountRowBox || !taxRowBox) throw new Error('Expected visible summary input rows')
  expect(Math.abs(discountRowBox.height - taxRowBox.height)).toBeLessThanOrEqual(2)

  await dialog.getByRole('combobox', { name: 'Currency', exact: true }).click()
  await page.getByRole('option', { name: /^IDR —/ }).click()
  await expect(discountUnit).toHaveText('IDR')
  expect(await discountUnit.evaluate(singleLineText)).toBe(true)
  await expect(dialog.locator('#invoice-editor .ic-amount dd')).toHaveText('IDR 750')
  await dialog
    .locator('.ic-sheet-summary')
    .screenshot({ path: info.outputPath('summary-fixed-discount.png') })

  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  expect(await discountUnit.evaluate(singleLineText)).toBe(true)
})

test('removes the nested dark editor header bar and aligns More options in 3 columns', async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.ic-panel-bar')).toHaveCount(0)

  const headerControls = dialog.locator('.ic-dialog-intro .ic-editor-appearance')
  const switcher = headerControls.getByRole('navigation', { name: 'Invoice view' })
  const colorControl = headerControls.locator('.ic-color-control')
  const layoutTrigger = headerControls.getByRole('combobox', { name: 'Layout', exact: true })
  await expect(switcher).toBeVisible()

  const switcherBox = await switcher.boundingBox()
  const colorBox = await colorControl.boundingBox()
  const layoutBox = await layoutTrigger.boundingBox()
  if (!switcherBox || !colorBox || !layoutBox) {
    throw new Error('Expected visible modal header controls')
  }
  expect(Math.abs(switcherBox.height - colorBox.height)).toBeLessThanOrEqual(2)
  expect(Math.abs(layoutBox.height - colorBox.height)).toBeLessThanOrEqual(2)
  expect(
    Math.abs(switcherBox.y + switcherBox.height - (colorBox.y + colorBox.height)),
  ).toBeLessThanOrEqual(2)
  expect(
    Math.abs(layoutBox.y + layoutBox.height - (colorBox.y + colorBox.height)),
  ).toBeLessThanOrEqual(2)

  await dialog.locator('details.ic-detail summary').click()
  const senderCountry = dialog.getByRole('combobox', { name: 'Sender country', exact: true })
  const clientCountry = dialog.getByRole('combobox', {
    name: 'Billing contact country',
    exact: true,
  })
  const discountType = dialog.getByRole('combobox', { name: 'Discount type', exact: true })
  await expect(senderCountry).toBeVisible()
  await expect(clientCountry).toBeVisible()
  await expect(discountType).toBeVisible()

  const senderBox = await senderCountry.boundingBox()
  const clientBox = await clientCountry.boundingBox()
  const discountBox = await discountType.boundingBox()
  if (!senderBox || !clientBox || !discountBox) {
    throw new Error('Expected visible More options controls')
  }
  expect(Math.abs(senderBox.y - clientBox.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(clientBox.y - discountBox.y)).toBeLessThanOrEqual(2)

  await dialog.screenshot({ path: info.outputPath('invoice-modal-header-desktop.png') })

  await switcher.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(dialog.locator('.ic-sheet-tools')).not.toBeVisible()
  await expect(dialog.locator('#invoice-preview')).toBeVisible()

  await switcher.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(dialog.locator('.ic-sheet-tools')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(dialog).toHaveCSS('color-scheme', 'dark')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)

  const mobileDialogBox = await dialog.boundingBox()
  const mobileSwitcherBox = await switcher.boundingBox()
  const mobileLayoutBox = await layoutTrigger.boundingBox()
  if (!mobileDialogBox || !mobileSwitcherBox || !mobileLayoutBox) {
    throw new Error('Expected visible mobile modal controls')
  }
  expect(mobileSwitcherBox.y + mobileSwitcherBox.height).toBeLessThan(mobileLayoutBox.y)
  expect(mobileSwitcherBox.width).toBeGreaterThan(mobileDialogBox.width * 0.8)
  await dialog.screenshot({ path: info.outputPath('invoice-modal-header-mobile.png') })

  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})

test('places compact saved client and product modal triggers beside Bill to and Line items with 2-column options', async ({
  page,
}, info) => {
  const product = {
    ...newProduct('USD'),
    name: 'Design retainer',
    items: [{ ...newItem('Monthly design'), rate: '750' }],
  }
  const company = newCompany('North Studio')
  const seedInvoice = newInvoice(company, [])
  const savedResult = saveInvoice(
    { ...newWorkspace(), companies: [company], products: [product] },
    {
      ...seedInvoice,
      number: 'NORTH-0001',
      client: {
        ...seedInvoice.client,
        name: 'Fieldwork Press',
        email: 'billing@example.com',
      },
      items: [{ ...newItem('Discovery'), rate: '500' }],
    },
  )
  if (!savedResult.ok) throw new Error(savedResult.message)

  await page.addInitScript(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(savedResult.data),
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  const options = dialog.getByRole('region', { name: 'Invoice options' })
  const sheet = dialog.getByRole('article', { name: 'Editable invoice' })

  await expect(options.getByRole('combobox')).toHaveCount(2)
  const companyTrigger = options.getByRole('combobox', { name: 'Company', exact: true })
  const currencyTrigger = options.getByRole('combobox', { name: 'Currency', exact: true })
  const companyBox = await companyTrigger.boundingBox()
  const currencyBox = await currencyTrigger.boundingBox()
  if (!companyBox || !currencyBox) throw new Error('Expected 2-column options triggers')
  expect(Math.abs(companyBox.y - currencyBox.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(companyBox.width - currencyBox.width)).toBeLessThanOrEqual(4)

  const clientBtn = sheet.getByRole('button', { name: 'Use saved client', exact: true })
  const productBtn = sheet.getByRole('button', { name: 'Add product', exact: true })
  const clientBtnBox = await clientBtn.boundingBox()
  const productBtnBox = await productBtn.boundingBox()
  const senderNameBox = await sheet.getByLabel('Sender name').boundingBox()
  const clientNameBox = await sheet
    .getByRole('textbox', { name: 'Client', exact: true })
    .boundingBox()
  if (!clientBtnBox || !productBtnBox || !senderNameBox || !clientNameBox) {
    throw new Error('Expected visible sheet triggers and party inputs')
  }
  expect(clientBtnBox.height).toBeLessThanOrEqual(28)
  expect(productBtnBox.height).toBeLessThanOrEqual(28)
  expect(Math.abs(senderNameBox.y - clientNameBox.y)).toBeLessThanOrEqual(2)

  await dialog.screenshot({ path: info.outputPath('invoice-inline-picker-buttons-desktop.png') })

  await clientBtn.click()
  const clientModal = page.getByRole('dialog', { name: 'Use saved client' })
  await expect(clientModal).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(clientModal).toHaveCSS('color-scheme', 'dark')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.emulateMedia({ colorScheme: 'light' })
  await clientModal.screenshot({ path: info.outputPath('invoice-picker-modal-desktop.png') })
  await page.keyboard.press('Escape')
  await expect(clientModal).toHaveCount(0)
  await expect(dialog).toBeVisible()

  await productBtn.click()
  const productModal = page.getByRole('dialog', { name: 'Add product' })
  await expect(productModal).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await productModal.getByRole('button', { name: 'Close dialog' }).click()
  await expect(productModal).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Preview', exact: true }).click()
  const preview = dialog.getByRole('article', { name: 'Invoice document' })
  await expect(preview.getByRole('button', { name: 'Use saved client', exact: true })).toHaveCount(
    0,
  )
  await expect(preview.getByRole('button', { name: 'Add product', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click()

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await dialog.screenshot({ path: info.outputPath('invoice-inline-picker-buttons-mobile.png') })

  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})
