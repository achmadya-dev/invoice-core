import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('omits theme selector while respecting system color scheme and accessibility', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const backup = page.getByRole('button', { name: 'Backup', exact: true })
  const dialog = page.getByRole('dialog', { name: 'Backup' })
  const workspace = page.locator('.ic-workspace')

  await expect(
    page.getByRole('navigation', { name: 'Workspace' }).getByRole('combobox'),
  ).toHaveCount(0)
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await backup.click()
  await expect(dialog.getByRole('combobox', { name: 'Theme', exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await dialog.getByRole('button', { name: 'Close dialog' }).click()

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
})
