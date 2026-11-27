import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ')

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({
      preset: 'bun',
      routeRules: {
        '/**': {
          headers: {
            'content-security-policy': contentSecurityPolicy,
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'referrer-policy': 'no-referrer',
            'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
            'cross-origin-opener-policy': 'same-origin',
            'cross-origin-resource-policy': 'same-origin',
          },
        },
        '/invoice-sw.js': {
          headers: {
            'cache-control': 'no-cache, must-revalidate',
          },
        },
      },
    }),
    react(),
    tailwindcss(),
  ],
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
})
