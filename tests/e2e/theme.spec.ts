import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('switches between light and dark themes from the topbar and persists across reloads', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const workspace = page.locator('.ic-workspace')
  const themeSwitch = page.getByRole('switch', { name: 'Dark mode' })
  const backup = page.getByRole('button', { name: 'Backup', exact: true })
  const backupDialog = page.getByRole('dialog', { name: 'Backup' })

  await expect(page.locator('.ic-topbar').getByRole('combobox')).toHaveCount(0)
  await expect(themeSwitch).toBeVisible()
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'false')
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await themeSwitch.click()
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'true')
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await backup.click()
  await expect(backupDialog).toHaveCSS('opacity', '1')
  await expect(backupDialog).toHaveCSS('color-scheme', 'dark')
  await expect(backupDialog.getByRole('combobox', { name: 'Theme', exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await backupDialog.getByRole('button', { name: 'Close dialog' }).click()

  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const editorDialog = page.getByRole('dialog')
  const editorSheet = page.locator('#invoice-editor')
  await expect(editorDialog).toHaveCSS('opacity', '1')
  await expect(editorDialog).toHaveCSS('color-scheme', 'dark')
  await expect(editorSheet).toHaveCSS('color-scheme', 'light')
  await expect(editorSheet).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await editorDialog.getByRole('button', { name: 'Close dialog' }).click()

  await page.reload()
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'true')
  await expect(workspace).toHaveCSS('color-scheme', 'dark')

  await themeSwitch.click()
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'false')
  await expect(workspace).toHaveCSS('color-scheme', 'light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(workspace).toHaveCSS('color-scheme', 'light')
})

test('follows system color scheme by default until toggled', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')

  const workspace = page.locator('.ic-workspace')
  const themeSwitch = page.getByRole('switch', { name: 'Dark mode' })

  await expect(workspace).toHaveCSS('color-scheme', 'dark')
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'true')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await themeSwitch.click()
  await expect(themeSwitch).toHaveAttribute('aria-checked', 'false')
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
