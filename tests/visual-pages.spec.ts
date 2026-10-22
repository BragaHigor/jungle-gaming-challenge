import { test, expect } from '@playwright/test'
import { languages } from './helpers/demo'
import {
  prepareVisualPage,
  visualPages,
  type VisualPage,
} from './helpers/visual'

const baselinePages: readonly VisualPage[] = ['home', 'nft', 'cart', 'checkout']
for (const language of languages) {
  test.describe(`Revisão visual integrada em ${language}`, () => {
    for (const name of Object.keys(visualPages) as VisualPage[]) {
      test(`preserva a tela ${name} com dados carregados e sem overflow`, async ({
        page,
        browser,
      }, testInfo) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await prepareVisualPage(page, name, language)
        const fullPage = name !== 'login' && name !== 'register'
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const path = testInfo.outputPath(`${name}-${language}.png`)
        await page.screenshot({ path, fullPage, animations: 'disabled' })
        await testInfo.attach('Página carregada', {
          path,
          contentType: 'image/png',
        })
        if (
          language === 'pt-BR' &&
          testInfo.project.use.viewport?.width === 414 &&
          fullPage
        ) {
          const viewportPath = testInfo.outputPath('primeira-dobra.png')
          await page.screenshot({ path: viewportPath, animations: 'disabled' })
          await testInfo.attach('Primeira dobra de referência', {
            path: viewportPath,
            contentType: 'image/png',
          })
        }
        if (language === 'pt-BR' && baselinePages.includes(name))
          await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true })
        await testInfo.attach('Ambiente da captura', {
          body: JSON.stringify(
            {
              platform: process.platform,
              node: process.version,
              browser: browser.version(),
              language,
              viewport: testInfo.project.use.viewport,
              captureTime: '2026-10-21T15:00:00Z',
            },
            null,
            2,
          ),
          contentType: 'application/json',
        })
        expect(errors).toEqual([])
      })
    }
  })
}
