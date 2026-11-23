import { expect, test } from '@playwright/test'

test('theme picker supports keyboard selection, system mode, and a saved preference on mobile', async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const theme = page.getByRole('combobox', { name: 'Theme', exact: true })
  const workspace = page.locator('.ic-workspace')
  const header = page.getByRole('banner')
  await expect(theme).toBeEnabled()
  await expect(theme.getByRole('option')).toHaveText(['System', 'Light', 'Dark'])
  await expect(theme).toHaveValue('system')
  await header.screenshot({ path: info.outputPath('theme-desktop-system.png') })

  await page.getByRole('button', { name: 'Backup', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(theme).toBeFocused()
  await expect(theme).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('ArrowDown')
  await expect(workspace).toHaveAttribute('data-theme', 'light')
  await page.keyboard.press('ArrowDown')
  await expect(workspace).toHaveAttribute('data-theme', 'dark')

  await page.setViewportSize({ width: 320, height: 780 })
  await page.reload()
  await expect(theme).toHaveValue('dark')
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await header.screenshot({ path: info.outputPath('theme-mobile-dark.png') })

  await theme.selectOption('system')
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
})
