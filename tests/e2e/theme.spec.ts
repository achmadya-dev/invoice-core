import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('theme picker supports Base UI contrast, keyboard selection, system mode, and mobile layout', async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const theme = page.getByRole('combobox', { name: 'Theme', exact: true })
  const workspace = page.locator('.ic-workspace')
  const popup = page.locator('.ic-theme-popup[data-open]')
  const mountedPopup = page.locator('.ic-theme-popup')

  await expect(theme).toBeEnabled()
  await expect(theme).toHaveText('System')

  await page.getByRole('button', { name: 'Companies', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(theme).toBeFocused()
  await expect(theme).toHaveCSS('outline-style', 'solid')

  await page.keyboard.press('Enter')
  await expect(popup).toBeVisible()
  await expect(popup).toHaveCSS('opacity', '1')
  await expect(page.getByRole('option')).toHaveText(['System', 'Light', 'Dark'])

  const lightColors = await page.evaluate(() => {
    const menu = document.querySelector('.ic-theme-popup[data-open]')
    const unselected = Array.from(document.querySelectorAll('.ic-theme-option')).find(
      (option) => !option.hasAttribute('data-selected') && !option.hasAttribute('data-highlighted'),
    )
    if (!menu || !unselected) return null
    return {
      menuBg: getComputedStyle(menu).backgroundColor,
      optionColor: getComputedStyle(unselected).color,
    }
  })
  expect(lightColors).not.toBeNull()
  expect(lightColors?.menuBg).not.toBe(lightColors?.optionColor)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({
    path: info.outputPath('theme-desktop-open-light.png'),
    clip: { x: 0, y: 0, width: 1280, height: 280 },
  })

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(workspace).toHaveAttribute('data-theme', 'light')
  await expect(theme).toHaveText('Light')
  await expect(mountedPopup).toBeHidden()
  await expect(theme).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(popup).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(workspace).toHaveAttribute('data-theme', 'dark')
  await expect(theme).toHaveText('Dark')
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
  await expect(mountedPopup).toBeHidden()
  await expect(theme).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(popup).toBeVisible()
  await expect(popup).toHaveCSS('opacity', '1')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.screenshot({
    path: info.outputPath('theme-desktop-open-dark.png'),
    clip: { x: 0, y: 0, width: 1280, height: 280 },
  })
  await page.keyboard.press('Escape')
  await expect(mountedPopup).toBeHidden()
  await expect(theme).toBeFocused()

  await page.setViewportSize({ width: 320, height: 780 })
  await page.reload()
  await expect(theme).toHaveText('Dark')
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )

  await theme.click()
  await expect(popup).toBeVisible()
  await expect(popup).toHaveCSS('opacity', '1')
  expect(
    await popup.evaluate((element) => {
      const { left, right } = element.getBoundingClientRect()
      return left >= 0 && right <= window.innerWidth
    }),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('theme-mobile-dark-open.png'),
    clip: { x: 0, y: 0, width: 320, height: 320 },
  })

  await page.getByRole('option', { name: 'System', exact: true }).click()
  await expect(theme).toHaveText('System')
  await expect(workspace).toHaveCSS('color-scheme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(workspace).toHaveCSS('color-scheme', 'dark')
})
