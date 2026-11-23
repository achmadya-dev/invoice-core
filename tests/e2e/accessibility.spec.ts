import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('home has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Invoices', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create invoice', exact: true })).toBeEnabled()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit invoice' })).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('the checker detects a missing accessible name', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const button = document.createElement('button')
    document.body.append(button)
  })

  const results = await new AxeBuilder({ page }).withRules(['button-name']).analyze()
  expect(results.violations.map((violation) => violation.id)).toContain('button-name')
})

test('home navigation is keyboard accessible', async ({ page }) => {
  await page.goto('/')
  const home = page.getByRole('button', { name: 'Invoice Core' })
  await page.keyboard.press('Tab')
  await expect(home).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/')
})
