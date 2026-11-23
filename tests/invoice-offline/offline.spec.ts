import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('reopens the built editor and exports PDF offline without caching account routes or draft data', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load example' }).click()
  await page.getByLabel('Client name', { exact: true }).fill('Local Offline Client')
  await expect(page.getByText('Available offline')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Invoice Core' }).click()
  await expect(page.getByRole('heading', { name: 'Invoice editor' })).toBeVisible()
  const entries = await page.evaluate(async () => {
    const cache = await caches.open('invoice-core-shell-v1')
    const root = await cache.match('/')
    return {
      shell: await root?.text(),
      paths: (await cache.keys()).map((entry) => new URL(entry.url).pathname),
    }
  })
  expect(entries.shell).toContain('Opening the local workspace')
  expect(entries.shell).not.toContain('Local Offline Client')
  expect(entries.paths).not.toContain('/login')
  expect(entries.paths).not.toContain('/account')
  expect(entries.paths.some((path) => path.startsWith('/api/'))).toBe(false)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByLabel('Client name', { exact: true })).toHaveValue('Local Offline Client')
  await page.getByLabel('Quantity, item 2').fill('3')
  await expect(page.locator('.ic-amount dd')).toHaveText('$1,875.00')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  expect((await readFile(await (await download).path())).subarray(0, 5).toString()).toBe('%PDF-')
})
