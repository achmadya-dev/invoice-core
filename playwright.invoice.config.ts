import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/invoice-offline',
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3121',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: 'bun run start',
    url: 'http://127.0.0.1:3121',
    env: { HOST: '127.0.0.1', PORT: '3121' },
    reuseExistingServer: false,
  },
})
