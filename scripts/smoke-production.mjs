import { spawn } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'
import assert from 'node:assert/strict'

assert.ok(process.versions.bun, 'Production smoke harness must run on Bun')
const port = '3120'
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: port,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
server.stdout.on('data', (data) => {
  output += data.toString()
})
server.stderr.on('data', (data) => {
  output += data.toString()
})
let startupError
server.on('error', (error) => {
  startupError = error
})
function assertSecurityHeaders(headers, target) {
  assert.equal(
    headers.get('x-content-type-options'),
    'nosniff',
    `${target} must set X-Content-Type-Options: nosniff`,
  )
  assert.equal(headers.get('x-frame-options'), 'DENY', `${target} must set X-Frame-Options: DENY`)
  assert.equal(
    headers.get('referrer-policy'),
    'no-referrer',
    `${target} must set Referrer-Policy: no-referrer`,
  )
  assert.ok(
    headers.get('permissions-policy')?.includes('camera=()'),
    `${target} must restrict Permissions-Policy`,
  )
  assert.equal(
    headers.get('cross-origin-opener-policy'),
    'same-origin',
    `${target} must set Cross-Origin-Opener-Policy: same-origin`,
  )
  assert.equal(
    headers.get('cross-origin-resource-policy'),
    'same-origin',
    `${target} must set Cross-Origin-Resource-Policy: same-origin`,
  )
  const csp = headers.get('content-security-policy') ?? ''
  assert.ok(csp.includes("default-src 'self'"), `${target} CSP must include default-src 'self'`)
  assert.ok(
    csp.includes("frame-ancestors 'none'"),
    `${target} CSP must include frame-ancestors 'none'`,
  )
  assert.ok(csp.includes("frame-src 'none'"), `${target} CSP must include frame-src 'none'`)
  assert.ok(csp.includes("object-src 'none'"), `${target} CSP must include object-src 'none'`)
  assert.ok(
    csp.includes('wasm-unsafe-eval'),
    `${target} CSP must allow Yoga WASM via 'wasm-unsafe-eval'`,
  )
  assert.ok(
    !csp.includes('upgrade-insecure-requests'),
    `${target} CSP must not force HTTPS upgrades on loopback`,
  )
  assert.ok(
    !/(?:^|[\s;])'unsafe-eval'(?:$|[\s;])/.test(csp),
    `${target} CSP must not allow 'unsafe-eval'`,
  )
}

try {
  let response
  for (let attempt = 0; attempt < 60; attempt++) {
    if (startupError) throw startupError
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`)
    try {
      response = await fetch(origin, { signal: AbortSignal.timeout(1000) })
      break
    } catch {
      await setTimeout(250)
    }
  }
  assert.ok(response, `Production server did not start: ${output}`)
  assert.equal(response.status, 200, output)
  assertSecurityHeaders(response.headers, 'Home page')
  const html = await response.text()
  assert.match(
    html,
    /<html\b[^>]*\blang="en"[^>]*>/,
    'Home page must declare English as its language',
  )
  assert.match(
    html,
    /<html\b[^>]*\bdata-theme="system"[^>]*>/,
    'Home page must default data-theme to system during SSR',
  )
  assert.match(html, /<h1>Invoices<\/h1>/, 'Home page should render the invoice list shell')
  assert.ok(html.includes('Opening the local workspace'), 'Browser data must load after hydration')
  assert.ok(html.includes('/invoice.webmanifest'), 'Home page should link the PWA manifest')
  assert.ok(!html.includes('Sign in'), 'Home page must not expose a sign-in control')

  const assetMatch = html.match(/\/assets\/[^"]+\.(?:css|js)/)
  assert.ok(assetMatch, 'Home page must reference a hashed static bundle asset')
  const assetResponse = await fetch(`${origin}${assetMatch[0]}`)
  assert.equal(assetResponse.status, 200, `Asset ${assetMatch[0]} must return HTTP 200`)
  assert.match(
    assetResponse.headers.get('cache-control') ?? '',
    /immutable/,
    `Asset ${assetMatch[0]} must preserve immutable caching`,
  )
  assertSecurityHeaders(assetResponse.headers, `Asset ${assetMatch[0]}`)

  const swResponse = await fetch(`${origin}/invoice-sw.js`)
  assert.equal(swResponse.status, 200, '/invoice-sw.js must return HTTP 200')
  assert.equal(
    swResponse.headers.get('cache-control'),
    'no-cache, must-revalidate',
    '/invoice-sw.js must disable stale caching',
  )
  assertSecurityHeaders(swResponse.headers, 'Service worker')

  for (const path of ['/login', '/account', '/api/auth/get-session']) {
    const removed = await fetch(`${origin}${path}`, { redirect: 'manual' })
    assert.equal(removed.status, 404, `Removed route ${path} must return 404`)
    assertSecurityHeaders(removed.headers, `Removed route ${path}`)
    assert.ok((await removed.text()).includes('Page not found'))
  }
  const formerSignIn = await fetch(`${origin}/api/auth/sign-in/email`, { method: 'POST' })
  assert.equal(formerSignIn.status, 404, 'Former sign-in endpoint must not accept requests')
  console.log(
    `Production smoke passed on Bun ${process.versions.bun}: invoice shell HTTP 200 with security headers and SW no-cache; former account and auth routes HTTP 404.`,
  )
} finally {
  server.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => server.once('exit', resolve)), setTimeout(3000)])
  if (server.exitCode === null) server.kill('SIGKILL')
}
