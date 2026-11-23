import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

async function chooseOption(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  const openPopup = page.locator('.ic-select-popup[data-open]')
  await expect(openPopup).toBeVisible()
  await openPopup.getByRole('option', { name: option }).click()
  await expect(page.locator('.ic-select-popup[data-ending-style]')).toHaveCount(0)
}

test('edits, saves, downloads, and duplicates an invoice', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invoice editor')
  await expect(page.getByText('Sign in', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /print/i })).toHaveCount(0)

  const editor = page.locator('#invoice-editor')
  const preview = page.locator('#invoice-preview')
  await expect(page.getByRole('button', { name: 'New invoice' })).toHaveCount(0)
  await expect(editor.getByRole('button', { name: 'Load example' })).toBeVisible()
  await expect(preview.getByRole('button', { name: 'Expand', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Save invoice' }).click()
  const validation = page.getByRole('alert')
  await expect(validation).toContainText('Enter a sender, client')
  await expect(validation).toHaveClass(/\bic-error\b/)
  await editor.getByRole('button', { name: 'Load example' }).click()
  await expect(editor.getByRole('button', { name: 'Load example' })).toHaveCount(0)
  const resetDraft = editor.getByRole('button', { name: 'Reset draft', exact: true })
  await expect(resetDraft).toBeVisible()
  await resetDraft.click()
  const resetDialog = page.getByRole('alertdialog')
  await expect(resetDialog).toContainText('Discard unsaved changes?')
  await resetDialog.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(resetDialog).toHaveCount(0)

  const template = page.getByRole('combobox', { name: 'Line item template' })
  await expect(template).toBeVisible()
  await expect(template).toHaveClass(/\bic-select-trigger-compact\b/)
  await template.click()
  const templatePopup = page.locator('.ic-template-popup[data-open]')
  await expect(templatePopup).toBeVisible()
  for (const group of [
    'Software & IT',
    'Coaching & Consulting',
    'Design',
    'Accounting & Tax',
    'Finance & Advisory',
    'General',
  ]) {
    await expect(templatePopup.getByText(group, { exact: true })).toBeVisible()
  }
  await expect(
    templatePopup.getByRole('option', { name: 'Software development — retainer', exact: true }),
  ).toBeVisible()
  await expect(
    templatePopup.getByRole('option', { name: 'Dev + infrastructure (pass-through)', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: info.outputPath('template-dropdown-desktop.png') })
  await page.keyboard.press('Escape')
  await expect(page.locator('.ic-select-popup[data-ending-style]')).toHaveCount(0)
  const amount = page.locator('.ic-amount dd')
  await expect(amount).toHaveText('$1,600.00')
  await chooseOption(page, 'Line item template', 'Design project')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  const replaceItemsDialog = page.getByRole('alertdialog')
  await expect(replaceItemsDialog).toContainText('Replace current line items?')
  await replaceItemsDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(replaceItemsDialog).toHaveCount(0)
  await expect(amount).toHaveText('$1,600.00')
  await expect(page.getByRole('table', { name: 'Invoice line items', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save invoice' }).click()
  await expect(page.getByRole('status')).toHaveText('Invoice saved to history.')
  await expect(page.getByRole('button', { name: 'New invoice' })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Duplicate', exact: true })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Delete', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('invoice-desktop.png'), fullPage: true })

  await preview.getByRole('button', { name: 'Expand', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit invoice' })).not.toBeVisible()
  const split = preview.getByRole('button', { name: 'Split view', exact: true })
  await expect(split).toHaveAttribute('aria-pressed', 'true')
  await split.click()
  await expect(page.getByRole('heading', { name: 'Edit invoice' })).toBeVisible()

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
  const status = page.getByRole('combobox', { name: 'Status', exact: true })
  await status.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Sent', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('status-dropdown-desktop.png') })
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(status).toHaveText('Sent')
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
  await expect(page).toHaveURL(/#history$/)
  await page.getByLabel('Search invoices').fill('something missing')
  await expect(page.getByText('No invoices match these filters.')).toBeVisible()
  await page.getByLabel('Search invoices').fill('Fieldwork')
  await chooseOption(page, 'Filter by company', 'Personal')
  await expect(page.getByRole('button', { name: 'INV-0001', exact: true })).toBeVisible()
  await expect(page.getByText('Showing 1 of 1 saved invoice(s)')).toBeVisible()

  const rowStatus = page.getByRole('combobox', { name: 'Status for INV-0001', exact: true })
  await expect(rowStatus).toHaveText('Sent')
  await chooseOption(page, 'Status for INV-0001', 'Paid')
  await expect(rowStatus).toHaveText('Paid')
  await expect(page.getByRole('status')).toHaveText('Marked INV-0001 as paid.')

  await chooseOption(page, 'Filter by status', 'Draft')
  await expect(page.getByText('No invoices match these filters.')).toBeVisible()
  await chooseOption(page, 'Filter by status', 'Paid')
  await chooseOption(page, 'Filter by company', 'All companies')
  await expect(page.getByRole('button', { name: 'INV-0001', exact: true })).toBeVisible()

  const historyPdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF for INV-0001', exact: true }).click()
  const historyPdfFile = await historyPdf
  expect(historyPdfFile.suggestedFilename()).toBe('INV-0001.pdf')
  expect((await readFile(await historyPdfFile.path())).subarray(0, 5).toString()).toBe('%PDF-')

  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invoice history')
  await expect(page.getByRole('button', { name: 'INV-0001', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Duplicate INV-0001' }).click()
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0002')
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveText('Draft')
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
  const senderCountry = page.getByRole('combobox', { name: 'Sender country', exact: true })
  await senderCountry.fill('Indo')
  await page.getByRole('option', { name: 'Indonesia', exact: true }).click()
  const logo = page.getByLabel('Company logo')
  await logo.setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  })
  await expect(page.getByRole('alert')).toContainText('Choose a valid PNG or JPEG')
  await logo.setInputFiles('public/invoice-192.png')
  await expect(page.getByRole('button', { name: 'Remove logo' })).toBeVisible()
  await chooseOption(page, 'Default currency', /^IDR —/)
  await page.getByLabel('Invoice prefix').fill('MAP-')
  await page.getByLabel('Next number').fill('41')
  await page.getByRole('button', { name: 'Save company' }).click()
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await chooseOption(page, 'Sender profile', 'Maple Studio')
  await expect(page.getByLabel('Invoice number')).toHaveValue('MAP-0041')
  await expect(page.getByRole('combobox', { name: 'Currency', exact: true })).toContainText('IDR')
  await expect(page.getByRole('article').getByText('Indonesia')).toBeVisible()
  await page.getByLabel('Client name', { exact: true }).fill('Synthetic Client')
  await chooseOption(page, 'Line item template', 'Design project')
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
  const restoreDialog = page.getByRole('alertdialog')
  await expect(restoreDialog).toBeVisible()
  await expect(restoreDialog).toContainText('1 saved invoice(s), 2 sender profile(s)')
  await restoreDialog.getByRole('button', { name: 'Cancel restore' }).click()
  await expect(restoreDialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Replace local workspace' })).toHaveCount(0)
  await picker.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer })
  await expect(restoreDialog).toBeVisible()
  await restoreDialog.getByRole('button', { name: 'Replace local workspace' }).click()
  await expect(restoreDialog).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Backup restored')
  await expect(page.getByText('1 / 500')).toBeVisible()
  await expect(page.getByText('2 / 50')).toBeVisible()
  await chooseOption(page, 'Theme', 'Dark')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveText('Dark')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Backup')
  await page.getByRole('button', { name: 'Editor', exact: true }).click()
  await expect(page.getByLabel('Client name', { exact: true })).toHaveValue('Synthetic Client')
  await expect(
    page.getByRole('combobox', { name: 'Reuse a previous client', exact: true }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  await page.getByRole('button', { name: 'Clear local workspace' }).click()
  const clearDialog = page.getByRole('alertdialog')
  await expect(clearDialog).toBeVisible()
  await clearDialog.getByRole('button', { name: 'Cancel clear' }).click()
  await expect(clearDialog).toHaveCount(0)
  await expect(page.getByText('1 / 500')).toBeVisible()
  await page.getByRole('button', { name: 'Clear local workspace' }).click()
  await expect(clearDialog).toBeVisible()
  await clearDialog.getByRole('button', { name: 'Confirm clear workspace' }).click()
  await expect(clearDialog).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Local workspace cleared.')
  await expect(page.getByText('0 / 500')).toBeVisible()
})

test('mobile switches between editing and the proof without losing input', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'New invoice' })).toHaveCount(0)
  await page.locator('#invoice-editor').getByRole('button', { name: 'Load example' }).click()
  await page.getByLabel('Quantity, item 2').fill('3')
  await page.screenshot({ path: info.outputPath('invoice-mobile-edit.png'), fullPage: true })
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit invoice' })).not.toBeVisible()
  await expect(page.locator('.ic-amount dd')).toHaveText('$1,875.00')
  await expect(
    page.locator('#invoice-preview').getByRole('button', { name: 'Expand', exact: true }),
  ).toBeHidden()
  await page.screenshot({ path: info.outputPath('invoice-mobile-preview.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const status = page.getByRole('combobox', { name: 'Status', exact: true })
  await status.press('Enter')
  await expect(page.getByRole('option', { name: 'Sent', exact: true })).toBeVisible()
  await expect(page.locator('.ic-select-popup[data-open]')).toHaveCSS('opacity', '1')
  expect(
    await page.locator('.ic-select-popup[data-open]').evaluate((element) => {
      const { left, right } = element.getBoundingClientRect()
      return left >= 0 && right <= window.innerWidth
    }),
  ).toBe(true)
  await page.screenshot({ path: info.outputPath('invoice-mobile-status-dropdown.png') })
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Quantity, item 2')).toHaveValue('3')
  await page.getByRole('button', { name: 'Add line item' }).press('Enter')
  await expect(page.getByLabel('Description, item 4')).toBeFocused()
  await page.getByRole('button', { name: 'Remove item 4' }).press('Enter')
  await expect(page.getByLabel('Description, item 3')).toBeFocused()
})
