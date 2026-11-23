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
  if (raw.length > maxBackupBytes) return null
  try {
    const decoded: unknown = JSON.parse(raw)
    const result = workspaceSchema.safeParse(decoded)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export type LocalWorkspace = { data: Workspace; raw: string | null; damaged: boolean }
export const storageUnavailable =
  'Browser storage is unavailable or full. Export a backup before leaving.'

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
        message: 'The workspace changed in another tab. Export this tab’s draft before reloading.',
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

export async function readLogo(file: File) {
  if (file.size > maxLogoBytes) return null
  const bytes = new Uint8Array(await file.arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (!png && !jpeg) return null
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: png ? 'image/png' : 'image/jpeg' }),
  )
  const fits = bitmap.width <= 4096 && bitmap.height <= 4096
  bitmap.close()
  if (!fits) return null
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return `data:image/${png ? 'png' : 'jpeg'};base64,${btoa(text)}`
}
