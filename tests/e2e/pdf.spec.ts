import { execFileSync, spawnSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { newItem } from '../../src/modules/invoice/domain/invoice'
import { decodeWorkspace, storageKey } from '../../src/modules/invoice/workspace.browser'

const popplerAvailable = spawnSync('pdftotext', ['-v']).status === 0

test('downloaded PDF matches the preview amounts and keeps all lines before the summary', async ({
  page,
}) => {
  test.skip(!popplerAvailable, 'Poppler pdftotext is needed to compare rendered PDF content.')
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  await page.getByRole('button', { name: 'Load example' }).click()
  await expect(page.locator('.ic-amount dd')).toHaveText('$1,600.00')
  const downloadText = async () => {
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PDF' }).click()
    return execFileSync('pdftotext', ['-layout', await (await pending).path(), '-'], {
      encoding: 'utf8',
    })
  }
  expect(await downloadText()).toContain('$1,600.00')

  const descriptions = Array.from(
    { length: 60 },
    (_, index) => `Service row ${String(index + 1).padStart(2, '0')}`,
  )
  const raw = await page.evaluate((key) => localStorage.getItem(key), storageKey)
  const workspace = raw && decodeWorkspace(raw)
  if (!workspace) throw new Error('Expected the example draft to be stored')
  workspace.draft.items = descriptions.map((description) => ({
    ...newItem(description),
    rate: '10',
  }))
  await page.evaluate(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(workspace),
  })
  await page.reload()
  await expect(page.locator('.ic-amount dd')).toHaveText('$600.00')

  const text = await downloadText()
  expect(text.split('\f').filter((content) => content.trim()).length).toBeGreaterThan(1)
  expect(text.match(/Service row \d{2}/g)).toEqual(descriptions)
  expect(text.indexOf('Subtotal')).toBeGreaterThan(text.indexOf('Service row 60'))
  expect(text.lastIndexOf('EXAMPLE-001')).toBeGreaterThan(text.indexOf('Amount due'))
  expect(text).toContain('$600.00')
})
