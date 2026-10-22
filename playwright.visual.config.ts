import { defineConfig } from '@playwright/test'

if (process.platform !== 'linux')
  throw new Error(
    'Execute a revisão visual no container Linux fixado no workflow visual.yml.',
  )
if (
  process.env.CI &&
  process.argv.some(
    (argument) =>
      argument.startsWith('--update-snapshots') &&
      argument !== '--update-snapshots=none',
  )
)
  throw new Error('As baselines não podem ser atualizadas pelo CI.')

export default defineConfig({
  testDir: './tests',
  testMatch: '**/visual-pages.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 45000,
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  outputDir: 'test-results/visual',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/visual', open: 'never' }],
  ],
  expect: {
    timeout: 15000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
      threshold: 0,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4182',
    browserName: 'chromium',
    headless: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [390, 414, 768, 1440].map((width) => ({
    name: `chromium-${width}`,
    use: {
      viewport: { width, height: 896 },
      isMobile: width < 700,
      hasTouch: width < 700,
    },
  })),
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4182 --strictPort',
    url: 'http://127.0.0.1:4182',
    reuseExistingServer: false,
  },
})
