import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('edits, saves, downloads, and duplicates an invoice', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invoice editor')
  await expect(page.getByText('Sign in', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter a sender, client')
  await page.getByRole('button', { name: 'Load example' }).click()
  const amount = page.locator('.ic-amount dd')
  await expect(amount).toHaveText('$1,600.00')
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByRole('status')).toHaveText('Invoice saved to history.')
  await page.screenshot({ path: info.outputPath('invoice-desktop.png'), fullPage: true })

  await page.locator('summary').filter({ hasText: 'Discount, tax, and shipping' }).click()
  await page.getByLabel('Discount (%)', { exact: true }).fill('10')
  await page.getByLabel('Tax label').fill('VAT')
  await page.getByLabel('Tax rate (%)').fill('12')
  await page.getByLabel('Shipping', { exact: true }).fill('25')
  await expect(amount).toHaveText('$1,637.80')
  await page.getByLabel('Quantity, item 2').fill('5e2')
  await expect(amount).toHaveText('—')
  await page.getByLabel('Quantity, item 2').fill('2')
  await expect(amount).toHaveText('$1,637.80')
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('sent')
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const downloaded = await pdf
  expect(downloaded.suggestedFilename()).toBe('INV-0001.pdf')
  const pdfPath = await downloaded.path()
  expect((await readFile(pdfPath)).subarray(0, 5).toString()).toBe('%PDF-')
  await downloaded.saveAs(info.outputPath('invoice-proof.pdf'))
  await page.reload()
  await expect(amount).toHaveText('$1,637.80')
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await page.getByLabel('Search invoices').fill('something missing')
  await expect(page.getByText('No invoices match these filters.')).toBeVisible()
  await page.getByLabel('Search invoices').fill('Fieldwork')
  await page.getByLabel('Filter by company').selectOption({ label: 'Personal' })
  await expect(page.getByRole('button', { name: 'INV-0001', exact: true })).toBeVisible()
  await expect(page.getByText('sent', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Duplicate INV-0001' }).click()
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0002')
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('draft')
  await expect(amount).toHaveText('$1,637.80')
  expect(errors).toEqual([])
})

test('uses company defaults, preserves historical sender details, and verifies restore before replacing data', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Companies' }).click()
  await page.getByRole('button', { name: 'Add company' }).click()
  await page.getByLabel('Sender name').fill('Maple Studio')
  await page.getByLabel('Sender country').selectOption('ID')
  const logo = page.getByLabel('Company logo')
  await logo.setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  })
  await expect(page.getByRole('alert')).toContainText('Choose a valid PNG or JPEG')
  await logo.setInputFiles('public/invoice-192.png')
  await expect(page.getByRole('button', { name: 'Remove logo' })).toBeVisible()
  await page.getByLabel('Default currency').selectOption('IDR')
  await page.getByLabel('Invoice prefix').fill('MAP-')
  await page.getByLabel('Next number').fill('41')
  await page.getByRole('button', { name: 'Save company' }).click()
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByLabel('Sender profile').selectOption({ label: 'Maple Studio' })
  await expect(page.getByLabel('Invoice number')).toHaveValue('MAP-0041')
  await expect(page.getByRole('combobox', { name: 'Currency', exact: true })).toHaveValue('IDR')
  await expect(page.getByRole('article').getByText('Indonesia')).toBeVisible()
  await page.getByLabel('Client name', { exact: true }).fill('Synthetic Client')
  await page.getByLabel('Line item template').selectOption('Design project')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByLabel('Description, item 1')).toHaveValue('Design services')
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByRole('status')).toHaveText('Invoice saved to history.')
  await page.getByRole('button', { name: 'Companies' }).click()
  await page.getByRole('button', { name: 'Maple Studio IDR' }).click()
  await page.getByLabel('Sender name').fill('Maple Studio Updated')
  await page.getByRole('button', { name: 'Save company' }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText('Maple Studio ·', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Backup' }).click()
  const exportEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const backup = await exportEvent
  const buffer = await readFile(await backup.path())
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await page.getByLabel('Client name', { exact: true }).fill('Changed after export')
  await page.getByRole('button', { name: 'Backup' }).click()
  const picker = page.getByLabel('Invoice Core backup file')
  await picker.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  })
  await expect(page.getByRole('alert')).toContainText('Nothing was replaced')
  await picker.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer })
  await expect(
    page.getByText('1 saved invoice(s), 2 sender profile(s)', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel restore' }).click()
  await expect(page.getByRole('button', { name: 'Replace local workspace' })).not.toBeVisible()
  await picker.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer })
  await page.getByRole('button', { name: 'Replace local workspace' }).click()
  await expect(page.getByRole('status')).toContainText('Backup restored')
  await page.getByLabel('Theme').selectOption('dark')
  await page.reload()
  await expect(page.getByLabel('Theme')).toHaveValue('dark')
  await expect(page.getByLabel('Client name', { exact: true })).toHaveValue('Synthetic Client')
})

test('mobile switches between editing and the proof without losing input', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Load example' }).click()
  await page.getByLabel('Quantity, item 2').fill('3')
  await page.screenshot({ path: info.outputPath('invoice-mobile-edit.png'), fullPage: true })
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit invoice' })).not.toBeVisible()
  await expect(page.locator('.ic-amount dd')).toHaveText('$1,875.00')
  await page.screenshot({ path: info.outputPath('invoice-mobile-preview.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Quantity, item 2')).toHaveValue('3')
  await page.getByRole('button', { name: 'Add line item' }).press('Enter')
  await expect(page.getByLabel('Description, item 4')).toBeFocused()
  await page.getByRole('button', { name: 'Remove item 4' }).press('Enter')
  await expect(page.getByLabel('Description, item 3')).toBeFocused()
})
