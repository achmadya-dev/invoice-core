import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('enforces light-only color scheme without a theme selector', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const backup = page.getByRole('button', { name: 'Backup', exact: true })
  const dialog = page.getByRole('dialog', { name: 'Backup' })
  const workspace = page.locator('.ic-workspace')

  await expect(page.locator('.ic-topbar').getByRole('combobox')).toHaveCount(0)
  await expect(
    page.getByRole('tablist', { name: 'Workspace sections' }).getByRole('combobox'),
  ).toHaveCount(0)
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await backup.click()
  await expect(dialog).toHaveCSS('opacity', '1')
  await expect(dialog).toHaveCSS('color-scheme', 'light')
  await expect(dialog.getByRole('combobox', { name: 'Theme', exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await dialog.getByRole('button', { name: 'Close dialog' }).click()

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('keeps light color scheme when a restored workspace carries legacy dark theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => {
    localStorage.setItem(
      'invoice-core:workspace:v1',
      JSON.stringify({
        version: 4,
        theme: 'dark',
        companies: [],
        products: [],
        invoices: [],
      }),
    )
  })
  await page.goto('/')

  const workspace = page.locator('.ic-workspace')
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Backup' })).toHaveCSS('color-scheme', 'light')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
