import { expect, test, type Locator } from '@playwright/test'

async function measure(trigger: Locator) {
  return trigger.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return {
      x,
      y,
      width,
      height,
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
      viewportWidth: document.documentElement.clientWidth,
    }
  })
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`currency picker does not move the form at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
    const currency = page.getByRole('combobox', { name: 'Currency', exact: true })
    await currency.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    const before = await measure(currency)
    await currency.click()
    const list = page.getByRole('listbox')
    await expect(list.getByRole('option', { name: /^USD —/ })).toBeVisible()
    await expect(page.locator('.ic-select-popup[data-open]')).toHaveCSS('opacity', '1')
    expect(await measure(currency)).toEqual(before)
    const bounds = await list.boundingBox()
    expect(bounds).not.toBeNull()
    if (bounds) {
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
    }
    await page.keyboard.press('Escape')
    await expect(list).toHaveCount(0)
    expect(await measure(currency)).toEqual(before)
    await currency.focus()
    await page.keyboard.press('Enter')
    await expect(list).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(list).toHaveCount(0)
    await expect(currency).not.toHaveText(/USD —/)
    expect(await measure(currency)).toEqual(before)
  })
}
