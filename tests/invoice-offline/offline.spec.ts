import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  newCompany,
  newInvoice,
  newItem,
  newWorkspace,
  saveDraft,
} from '../../src/modules/invoice/domain/invoice'

test('keeps a saved workspace, retires the old shell, and exports PDF offline', async ({
  page,
  context,
}) => {
  const workspace = newWorkspace()
  const company = newCompany('Offline Studio')
  const draft = newInvoice(company, [])
  const initial = saveDraft({
    ...workspace,
    companies: [company],
    draft: {
      ...draft,
      client: { ...draft.client, name: 'Local Offline Client' },
      items: [
        { ...newItem('Services'), rate: '1050' },
        { ...newItem('Illustration'), quantity: '2', rate: '275' },
      ],
    },
  })
  if (!initial.ok) throw new Error(initial.message)

  // Seed the previous release's storage and cache on the same origin before booting the app.
  await page.goto('/invoice-mark.svg')
  const { companies, invoices, draft: active, theme, dirty } = initial.data
  await page.evaluate(
    async (seed) => {
      localStorage.setItem('invoice-core:workspace:v1', seed)
      const old = await caches.open('invoice-core-shell-v1')
      await old.put('/', new Response('<html><body><a href="/login">Sign in</a></body></html>'))
    },
    JSON.stringify({ version: 1, companies, invoices, draft: active, theme, dirty }),
  )

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Local Offline Client' })).toBeVisible()
  await expect(page.getByText('Available offline')).toBeVisible({ timeout: 30_000 })
  const removed = await page.goto('/login')
  expect(removed?.status()).toBe(404)
  await page.getByRole('link', { name: 'Back to invoices' }).click()
  await expect(page.getByRole('heading', { name: 'Invoices', exact: true })).toBeVisible()
  const entries = await page.evaluate(async () => {
    const cache = await caches.open('invoice-core-shell-v2')
    const root = await cache.match('/')
    return {
      shell: await root?.text(),
      paths: (await cache.keys()).map((entry) => new URL(entry.url).pathname),
      cacheNames: await caches.keys(),
    }
  })
  expect(entries.shell).toContain('Opening the local workspace')
  expect(entries.shell).not.toContain('Local Offline Client')
  expect(entries.shell).not.toContain('Sign in')
  expect(entries.cacheNames).not.toContain('invoice-core-shell-v1')
  expect(entries.paths).not.toContain('/login')
  expect(entries.paths).not.toContain('/account')
  expect(entries.paths.some((path) => path.startsWith('/api/'))).toBe(false)

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'INV-0001', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Client', exact: true })).toHaveValue(
    'Local Offline Client',
  )
  await page.getByLabel('Quantity, item 2').fill('3')
  await expect(page.locator('.ic-amount dd')).toHaveText('$1,875.00')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  expect((await readFile(await (await download).path())).subarray(0, 5).toString()).toBe('%PDF-')
})
