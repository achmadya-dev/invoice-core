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
  const html = await response.text()
  assert.ok(html.includes('<html lang="en">'), 'Home page must declare English as its language')
  assert.match(html, /<h1>Invoices<\/h1>/, 'Home page should render the invoice list shell')
  assert.ok(html.includes('Opening the local workspace'), 'Browser data must load after hydration')
  assert.ok(html.includes('/invoice.webmanifest'), 'Home page should link the PWA manifest')
  assert.ok(!html.includes('Sign in'), 'Home page must not expose a sign-in control')
  for (const path of ['/login', '/account', '/api/auth/get-session']) {
    const removed = await fetch(`${origin}${path}`, { redirect: 'manual' })
    assert.equal(removed.status, 404, `Removed route ${path} must return 404`)
    assert.ok((await removed.text()).includes('Page not found'))
  }
  const formerSignIn = await fetch(`${origin}/api/auth/sign-in/email`, { method: 'POST' })
  assert.equal(formerSignIn.status, 404, 'Former sign-in endpoint must not accept requests')
  console.log(
    `Production smoke passed on Bun ${process.versions.bun}: invoice shell HTTP 200; former account and auth routes HTTP 404.`,
  )
} finally {
  server.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => server.once('exit', resolve)), setTimeout(3000)])
  if (server.exitCode === null) server.kill('SIGKILL')
}
