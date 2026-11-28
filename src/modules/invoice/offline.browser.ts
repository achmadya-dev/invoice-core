import pdfFont from './assets/noto-sans-regular.ttf?url'
import pdfBoldFont from './assets/noto-sans-bold.ttf?url'
import { loadPdfRenderer } from './pdf.browser'

export async function prepareOffline(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.register('/invoice-sw.js', { scope: '/' })
    // Do not prepare the new shell using an older worker's cache during an update.
    const worker = registration.installing ?? registration.waiting ?? registration.active
    if (!worker || !(await waitForActivation(worker))) return false
    if (document.readyState !== 'complete') {
      await new Promise<void>((resolve) =>
        window.addEventListener('load', () => resolve(), { once: true }),
      )
    }
    // Warm the lazy PDF graph without rendering or accessing any invoice data.
    await loadPdfRenderer()
    const paths = new Set([
      pdfFont,
      pdfBoldFont,
      ...performance.getEntriesByType('resource').map((entry) => entry.name),
      ...Array.from(
        document.querySelectorAll<HTMLLinkElement>(
          'link[rel="stylesheet"],link[rel="modulepreload"]',
        ),
        (link) => link.href,
      ),
      ...Array.from(
        document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'),
        (script) => script.src,
      ),
    ])
    return await new Promise<boolean>((resolve) => {
      const channel = new MessageChannel()
      const finish = (value: boolean) => {
        window.clearTimeout(timeout)
        channel.port1.close()
        resolve(value)
      }
      const timeout = window.setTimeout(() => finish(false), 30_000)
      channel.port1.onmessage = (event: MessageEvent<unknown>) => finish(event.data === true)
      worker.postMessage({ type: 'prepare-invoice-shell', paths: [...paths] }, [channel.port2])
    })
  } catch {
    return false
  }
}

function waitForActivation(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (active: boolean) => {
      window.clearTimeout(timeout)
      worker.removeEventListener('statechange', check)
      resolve(active)
    }
    const check = () => {
      if (worker.state === 'activated') finish(true)
      if (worker.state === 'redundant') finish(false)
    }
    const timeout = window.setTimeout(() => finish(false), 30_000)
    worker.addEventListener('statechange', check)
    check()
  })
}
