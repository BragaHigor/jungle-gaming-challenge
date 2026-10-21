import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.DEPLOY_URL ?? 'http://127.0.0.1:4180'
const remote = Boolean(process.env.DEPLOY_URL)

export default defineConfig({
  testDir: './tests',
  testMatch: '**/deploy.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45000,
  outputDir: './test-results/deploy',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/deploy', open: 'never' }],
  ],
  use: {
    baseURL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: remote
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4180 --strictPort',
        url: baseURL,
        reuseExistingServer: false,
      },
})
