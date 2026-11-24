import { execFileSync, spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  newCompany,
  newInvoice,
  newItem,
  newWorkspace,
  saveInvoice,
} from '../../src/modules/invoice/domain/invoice'
import { storageKey } from '../../src/modules/invoice/workspace.browser'

const popplerAvailable = spawnSync('pdftotext', ['-v']).status === 0
const pdftoppmAvailable = spawnSync('pdftoppm', ['-v']).status === 0

test('downloaded PDF matches the preview amounts and keeps all lines before the summary', async ({
  page,
}) => {
  test.skip(!popplerAvailable, 'Poppler pdftotext is needed to compare rendered PDF content.')
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  await page.getByLabel('Invoice number').fill('EXAMPLE-001')
  await page.getByLabel('Sender name').fill('Northline Studio')
  await page.getByRole('textbox', { name: 'Client', exact: true }).fill('Fieldwork Press')
  await page.getByLabel('Description, item 1').fill('Editorial design')
  await page.getByLabel('Rate, item 1').fill('900')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await page.getByLabel('Description, item 2').fill('Illustration set')
  await page.getByLabel('Quantity, item 2').fill('2')
  await page.getByLabel('Rate, item 2').fill('275')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await page.getByLabel('Description, item 3').fill('Production files')
  await page.getByLabel('Rate, item 3').fill('150')
  await expect(page.locator('#invoice-editor .ic-amount dd')).toHaveText('$1,600.00')
  const downloadText = async () => {
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PDF' }).click()
    return execFileSync('pdftotext', ['-layout', await (await pending).path(), '-'], {
      encoding: 'utf8',
    })
  }
  const initialText = await downloadText()
  expect(initialText).toContain('$1,600.00')
  expect(initialText).not.toMatch(/Notes|Terms|Payment details/i)
  expect(initialText).not.toContain('e.g.')
  await page.getByLabel('Notes', { exact: true }).fill('For the design team')
  await page.getByLabel('Terms', { exact: true }).fill('Due in 14 days')
  await page.getByLabel('Payment details', { exact: true }).fill('Use reference SAMPLE-001')
  const withDetails = await downloadText()
  for (const text of ['For the design team', 'Due in 14 days', 'Use reference SAMPLE-001'])
    expect(withDetails).toContain(text)

  const descriptions = Array.from(
    { length: 60 },
    (_, index) => `Service row ${String(index + 1).padStart(2, '0')}`,
  )
  const company = newCompany('Example Studio')
  const invoice = newInvoice(company, [])
  const saved = saveInvoice(
    { ...newWorkspace(), companies: [company] },
    {
      ...invoice,
      number: 'EXAMPLE-001',
      client: { ...invoice.client, name: 'Example Client' },
      items: descriptions.map((description) => ({ ...newItem(description), rate: '10' })),
    },
  )
  if (!saved.ok) throw new Error(saved.message)
  await page.evaluate(({ key, json }) => localStorage.setItem(key, json), {
    key: storageKey,
    json: JSON.stringify(saved.data),
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'EXAMPLE-001', exact: true }).click()
  await expect(page.locator('#invoice-editor .ic-amount dd')).toHaveText('$600.00')

  const text = await downloadText()
  expect(text.split('\f').filter((content) => content.trim()).length).toBeGreaterThan(1)
  expect(text.match(/Service row \d{2}/g)).toEqual(descriptions)
  expect(text.indexOf('Subtotal')).toBeGreaterThan(text.indexOf('Service row 60'))
  expect(text.lastIndexOf('EXAMPLE-001')).toBeGreaterThan(text.indexOf('Amount due'))
  expect(text).toContain('$600.00')
})

test('all layouts keep IDR Amount due on one line and produce matching PDFs', async ({
  page,
}, info) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click()
  await page.getByLabel('Invoice number').fill('IDR-2026-01')
  await page.getByLabel('Sender name').fill('Nusantara Studio')
  await page.getByRole('textbox', { name: 'Client', exact: true }).fill('Maju Bersama')
  await page.getByRole('combobox', { name: 'Currency', exact: true }).click()
  await page.getByRole('option', { name: /^IDR —/ }).click()
  await page.getByLabel('Description, item 1').fill('Product design sprint')
  await page.getByLabel('Rate, item 1').fill('2500000')
  await page.getByLabel('Notes', { exact: true }).fill('Thank you for your business.')
  await page.getByLabel('Terms', { exact: true }).fill('Net 14 days')
  await page.getByLabel('Payment details', { exact: true }).fill('Bank transfer IDR-2026-01')
  await page.getByLabel('Accent color').fill('#047857')

  const isSingleLine = (element: Element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    const first = walker.nextNode()
    let last = first
    while (walker.nextNode()) last = walker.currentNode
    if (!first || !last) return false
    range.setStart(first, 0)
    range.setEnd(last, last.textContent?.length ?? 0)
    return range.getClientRects().length === 1
  }

  for (const [layoutKey, layoutLabel] of [
    ['classic', 'Classic'],
    ['modern', 'Modern'],
    ['minimal', 'Minimal'],
  ] as const) {
    await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
    await page.getByRole('option', { name: layoutLabel, exact: true }).click()

    const editorAmount = page.locator('#invoice-editor .ic-amount dd')
    await expect(editorAmount).toHaveText('IDR 2,500,000')
    expect(await editorAmount.evaluate(isSingleLine)).toBe(true)
    expect(
      await page.locator('#invoice-editor .ic-amount dt').evaluate((el) =>
        el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE
          ? (() => {
              const r = document.createRange()
              r.selectNodeContents(el.firstChild)
              return r.getClientRects().length === 1
            })()
          : false,
      ),
    ).toBe(true)

    const pendingPdf = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PDF' }).click()
    const download = await pendingPdf
    const pdfPath = await download.path()
    expect(pdfPath).toBeTruthy()
    expect((await readFile(pdfPath!)).subarray(0, 5).toString()).toBe('%PDF-')

    if (popplerAvailable) {
      const pdfText = execFileSync('pdftotext', ['-layout', pdfPath!, '-'], {
        encoding: 'utf8',
      })
      expect(pdfText).toContain('IDR 2,500,000')
      expect(pdfText).toContain('Amount due')
      expect(pdfText).toContain('Thank you for your business.')
      expect(pdfText).toContain('Net 14 days')
    }
    if (pdftoppmAvailable) {
      execFileSync('pdftoppm', [
        '-png',
        '-r',
        '144',
        '-singlefile',
        pdfPath!,
        info.outputPath(`pdf-${layoutKey}`),
      ])
    }

    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    const preview = page.locator('#invoice-preview')
    await expect(preview).toHaveAttribute('data-invoice-layout', layoutKey)
    await expect(preview.locator('.ic-amount dd')).toHaveText('IDR 2,500,000')
    expect(await preview.locator('.ic-amount dd').evaluate(isSingleLine)).toBe(true)
    await preview.screenshot({ path: info.outputPath(`preview-${layoutKey}.png`) })
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
  }
})
