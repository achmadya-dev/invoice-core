import pdfFont from './assets/noto-sans-regular.ttf?url'
import { loadPdfRenderer } from './pdf.browser'

export async function prepareOffline(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    await navigator.serviceWorker.register('/invoice-sw.js', { scope: '/' })
    const registration = await navigator.serviceWorker.ready
    if (document.readyState !== 'complete') {
      await new Promise<void>((resolve) =>
        window.addEventListener('load', () => resolve(), { once: true }),
      )
    }
    // Warm the lazy PDF graph without rendering or accessing any invoice data.
    await loadPdfRenderer()
    const paths = new Set([
      pdfFont,
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
      if (!registration.active) {
        finish(false)
        return
      }
      registration.active.postMessage({ type: 'prepare-invoice-shell', paths: [...paths] }, [
        channel.port2,
      ])
    })
  } catch {
    return false
  }
}
