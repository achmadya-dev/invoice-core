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

test('edits custom tax label in More options and shows Shipping currency unit across editor and preview', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  await dialog.locator('details.ic-detail summary').click()

  await dialog.getByLabel('Tax label', { exact: true }).fill('VAT')
  await dialog.getByLabel('Description, item 1').fill('Advisory')
  await dialog.getByLabel('Rate, item 1').fill('1000')
  await dialog.getByLabel('Tax rate (%)', { exact: true }).fill('11')

  const summaryRows = dialog.locator('#invoice-editor .ic-summary-input-row')
  await expect(summaryRows.nth(1)).toContainText('VAT')
  await expect(summaryRows.nth(2).locator('.ic-summary-unit')).toHaveText('USD')

  await dialog.getByRole('combobox', { name: 'Currency', exact: true }).click()
  await page.getByRole('option', { name: /^IDR —/ }).click()
  await expect(summaryRows.nth(2).locator('.ic-summary-unit')).toHaveText('IDR')

  await dialog.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(dialog.locator('#invoice-preview')).toContainText('VAT (11%)')
})

test('reorders invoice line items with Move up and Move down without mobile overflow', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const editor = page.locator('#invoice-editor')

  await editor.getByLabel('Description, item 1').fill('First')
  await editor.getByRole('button', { name: 'Add line item' }).click()
  await editor.getByLabel('Description, item 2').fill('Second')
  await editor.getByRole('button', { name: 'Add line item' }).click()
  await editor.getByLabel('Description, item 3').fill('Third')

  await expect(editor.getByRole('button', { name: 'Move item 1 up' })).toBeDisabled()
  await expect(editor.getByRole('button', { name: 'Move item 3 down' })).toBeDisabled()

  await editor.getByRole('button', { name: 'Move item 2 up' }).click()
  await expect(editor.getByLabel('Description, item 1')).toHaveValue('Second')
  await expect(editor.getByLabel('Description, item 2')).toHaveValue('First')

  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)

  await editor.getByRole('button', { name: 'Move item 1 down' }).click()
  await expect(editor.getByLabel('Description, item 1')).toHaveValue('First')
  await expect(editor.getByLabel('Description, item 2')).toHaveValue('Second')
})

test('paginates the Products catalog and resets page when searching', async ({ page }) => {
  const products = Array.from({ length: 12 }, (_, index) => ({
    ...newProduct('USD'),
    name: `Catalog Item ${String(index + 1).padStart(2, '0')}`,
    items: [{ ...newItem(`Service ${index + 1}`), rate: '100' }],
  }))
  await page.addInitScript(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify({ ...newWorkspace(), products }),
  })

  await page.goto('/#products')
  const section = page.getByRole('region', { name: 'Products', exact: true })
  const rows = section.getByRole('listitem')
  await expect(rows).toHaveCount(10)
  await expect(section.getByText('Showing 1–10 of 12 products')).toBeVisible()
  await expect(section.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()

  await section.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(rows).toHaveCount(2)
  await expect(section.getByText('Showing 11–12 of 12 products')).toBeVisible()
  await expect(section.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()

  await section.getByRole('searchbox', { name: 'Search products' }).fill('Catalog Item 12')
  await expect(rows).toHaveCount(1)
  await expect(section.getByRole('navigation', { name: 'Product catalog pages' })).toHaveCount(0)
})

test('keeps light custom accent colors accessible and supports resetting to default', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  const colorInput = dialog.getByLabel('Accent color', { exact: true })

  await expect(dialog.getByRole('button', { name: 'Reset accent color' })).toHaveCount(0)
  await colorInput.fill('#ffff00')
  await expect(dialog.locator('#invoice-editor')).toHaveAttribute('data-invoice-accent', '#ffff00')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  const reset = dialog.getByRole('button', { name: 'Reset accent color' })
  await expect(reset).toBeVisible()
  await reset.click()
  await expect(colorInput).toHaveValue('#4837a6')
  await expect(reset).toHaveCount(0)
})

test('surfaces cross-tab storage errors inside active editor and backup modals', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  await dialog.getByLabel('Sender name').fill('Northline Studio')
  await dialog.getByRole('textbox', { name: 'Client', exact: true }).fill('Fieldwork Press')
  await dialog.getByLabel('Description, item 1').fill('Audit')

  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: storageKey,
    value: JSON.stringify(newWorkspace()),
  })
  await dialog.getByRole('button', { name: 'Create invoice', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText('changed in another tab')
  await dialog.getByRole('button', { name: 'Close dialog' }).click()

  await page.reload()
  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const backupDialog = page.getByRole('dialog', { name: 'Backup' })
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: storageKey,
    value: JSON.stringify({ ...newWorkspace(), companies: [newCompany('Other Tab')] }),
  })
  await backupDialog.getByLabel('Invoice Core backup file').setInputFiles({
    name: 'workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(newWorkspace())),
  })
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Replace local workspace' })
    .click()
  await expect(backupDialog).toBeVisible()
  await expect(backupDialog.getByRole('alert')).toContainText('changed in another tab')
})

test('rejects corrupt logo bytes on backup restore and prioritizes matching-currency products', async ({
  page,
}) => {
  const company = newCompany('North Studio')
  const seedInvoice = newInvoice(company, [])
  const saved = saveInvoice(
    {
      ...newWorkspace(),
      companies: [company],
      products: [
        {
          ...newProduct('EUR'),
          name: 'Euro Retainer',
          items: [{ ...newItem('EU work'), rate: '500' }],
        },
        {
          ...newProduct('USD'),
          name: 'Dollar Sprint',
          items: [{ ...newItem('US work'), rate: '800' }],
        },
      ],
    },
    {
      ...seedInvoice,
      number: 'NORTH-1',
      client: { ...seedInvoice.client, name: 'Preserved Client' },
      items: [{ ...newItem('Design'), rate: '300' }],
    },
  )
  if (!saved.ok) throw new Error(saved.message)

  await page.addInitScript(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(saved.data),
  })
  await page.goto('/')

  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  await page
    .locator('#invoice-editor')
    .getByRole('button', { name: 'Add product', exact: true })
    .click()
  const picker = page.getByRole('dialog', { name: 'Add product' })
  const items = picker.getByRole('listitem')
  await expect(items.first()).toContainText('Dollar Sprint')
  await expect(items.nth(1)).toContainText('Euro Retainer')
  await expect(items.nth(1)).toContainText('(different currency)')
  await picker.getByRole('button', { name: 'Close dialog' }).click()
  await page
    .getByRole('dialog', { name: 'New invoice' })
    .getByRole('button', { name: 'Close dialog' })
    .click()

  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const backupDialog = page.getByRole('dialog', { name: 'Backup' })
  const badBackup = {
    ...newWorkspace(),
    companies: [
      {
        ...newCompany('Corrupt Logo Co'),
        sender: {
          ...newCompany('Corrupt Logo Co').sender,
          logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        },
      },
    ],
  }
  await backupDialog.getByLabel('Invoice Core backup file').setInputFiles({
    name: 'corrupt-logo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(badBackup)),
  })
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(backupDialog.getByRole('alert')).toContainText('invalid or oversized logo image')
  await backupDialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('button', { name: 'NORTH-1', exact: true })).toBeVisible()
})
