import {
  maxBackupBytes,
  maxLogoBytes,
  newWorkspace,
  workspaceSchema,
  type Workspace,
} from './domain/invoice'

// Keep the existing key so the versioned decoder can open workspaces from earlier releases.
export const storageKey = 'invoice-core:workspace:v1'

export function decodeWorkspace(raw: string): Workspace | null {
  if (raw.length > maxBackupBytes || new TextEncoder().encode(raw).byteLength > maxBackupBytes) {
    return null
  }
  try {
    const decoded: unknown = JSON.parse(raw)
    const result = workspaceSchema.safeParse(decoded)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export type LocalWorkspace = { data: Workspace; raw: string | null; damaged: boolean }
const storageUnavailable = 'Browser storage is unavailable or full. Export a backup before leaving.'

export function loadWorkspace(): LocalWorkspace & { warning: string } {
  try {
    const raw = localStorage.getItem(storageKey)
    const data = raw === null ? null : decodeWorkspace(raw)
    if (raw !== null && !data) {
      return {
        data: newWorkspace(),
        raw,
        damaged: true,
        warning:
          'The stored workspace could not be read. It was not changed. Use Backup to recover or restore it.',
      }
    }
    return { data: data ?? newWorkspace(), raw, damaged: false, warning: '' }
  } catch {
    return { data: newWorkspace(), raw: null, damaged: false, warning: storageUnavailable }
  }
}

export function writeWorkspace(
  current: LocalWorkspace,
  data: Workspace,
  replaceDamaged: boolean,
): { ok: true; value: LocalWorkspace } | { ok: false; message: string } {
  if (current.damaged && !replaceDamaged) {
    return {
      ok: false,
      message:
        'Stored data is unreadable. Use Backup to export the original or restore a valid file.',
    }
  }
  try {
    if (localStorage.getItem(storageKey) !== current.raw) {
      return {
        ok: false,
        message: 'The workspace changed in another tab. Reload to see its latest saved data.',
      }
    }
    const raw = JSON.stringify(data)
    if (raw.length > maxBackupBytes || new Blob([raw]).size > maxBackupBytes) {
      return {
        ok: false,
        message: 'This workspace is too large. Export a backup before reducing the stored data.',
      }
    }
    localStorage.setItem(storageKey, raw)
    return { ok: true, value: { data, raw, damaged: false } }
  } catch {
    return { ok: false, message: storageUnavailable }
  }
}

export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function detectImageFormat(bytes: Uint8Array): 'png' | 'jpeg' | null {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
  ) {
    return 'png'
  }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return 'jpeg'
  }
  return null
}

async function verifyImageBytes(bytes: Uint8Array): Promise<'png' | 'jpeg' | null> {
  if (bytes.byteLength > maxLogoBytes) return null
  const format = detectImageFormat(bytes)
  if (!format) return null
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: `image/${format}` }))
    return bitmap.width > 0 && bitmap.width <= 4096 && bitmap.height > 0 && bitmap.height <= 4096
      ? format
      : null
  } catch {
    return null
  } finally {
    bitmap?.close()
  }
}

function decodeBase64Bytes(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

export async function validateWorkspaceLogos(workspace: Workspace): Promise<boolean> {
  const logos = new Set<string>()
  for (const company of workspace.companies) {
    if (company.sender.logo) logos.add(company.sender.logo)
  }
  for (const invoice of workspace.invoices) {
    if (invoice.sender.logo) logos.add(invoice.sender.logo)
  }
  for (const entry of logos) {
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(entry)
    if (!match?.[1] || !match[2]) return false
    const bytes = decodeBase64Bytes(match[2])
    if (!bytes) return false
    const verified = await verifyImageBytes(bytes)
    if (verified !== match[1]) return false
  }
  return true
}

export async function readLogo(file: File) {
  if (file.size > maxLogoBytes) return null
  const bytes = new Uint8Array(await file.arrayBuffer())
  const format = await verifyImageBytes(bytes)
  if (!format) return null
  const chunks: string[] = []
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)))
  }
  return `data:image/${format};base64,${btoa(chunks.join(''))}`
}
