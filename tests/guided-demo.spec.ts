import { test, expect } from '@playwright/test'
import { visit, waitForAppReady } from './helpers/navigation'
import { languages, messages, openDemo, useLanguage } from './helpers/demo'
import { demoDestination } from '../src/constants/demo'
import { scenarios, demoStatusSchema, type Scenario } from '../src/schemas/demo'
import { cartRequest } from './helpers/cart'

for (const language of languages) {
  test.describe(`Demonstração guiada em ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await useLanguage(page, language)
      await visit(page, '/')
    })
    for (const scenario of [
      'empty',
      'unauthorized',
      'timeout',
      'malformed-event',
      'cart-empty',
      'order-confirmed',
      'account-read-failure',
      'session-expired',
      'favorites-ready',
    ] as const) {
      test(`abre a tela de ${scenario} sem exigir preparação manual e permite sair`, async ({
        page,
      }) => {
        const labels = messages[language].demo
        const { dialog } = await openDemo(page, language)
        await dialog
          .getByRole('combobox', { name: labels.guidedScenario, exact: true })
          .selectOption(scenario)
        await dialog
          .getByRole('button', { name: labels.guidedStart, exact: true })
          .click()
        await expect(dialog).toBeHidden()
        await expect(page).toHaveURL(demoDestination(scenario))
        const container =
          scenario === 'favorites-ready'
            ? page.getByRole('dialog', {
                name: messages[language].navigation.favorites,
                exact: true,
              })
            : page
        const banner = container
          .getByRole('region', { name: labels.activeTitle, exact: true })
          .filter({ visible: true })
          .last()
        await expect(banner).toContainText(labels[`scenario_${scenario}`])
        if (scenario === 'empty')
          await expect(
            page.getByRole('heading', {
              name: messages[language].catalog.emptyTitle,
              exact: true,
            }),
          ).toBeVisible()
        if (scenario === 'unauthorized' || scenario === 'timeout') {
          const timeout = scenario === 'timeout' ? 10000 : 5000
          await expect(
            page.getByRole('heading', {
              name: messages[language].catalog.errorTitle,
              exact: true,
            }),
          ).toBeVisible({ timeout })
        }
        if (scenario === 'malformed-event')
          await expect(banner).toContainText(
            labels.invalidEvent_one.replace('{{count}}', '1'),
          )
        if (scenario === 'order-confirmed')
          await expect(
            page.getByRole('heading', {
              name: messages[language].purchase.confirmed,
              exact: true,
            }),
          ).toBeVisible()
        if (scenario === 'cart-empty')
          await expect(
            page.getByRole('heading', {
              name: messages[language].purchase.empty,
              exact: true,
            }),
          ).toBeVisible()
        await banner
          .getByRole('button', { name: labels.exitDemo, exact: true })
          .click()
        await expect(page).toHaveURL('/')
        await expect(
          page.getByRole('region', { name: labels.activeTitle, exact: true }),
        ).toHaveCount(0)
        await expect(page.locator('.catalog-grid article')).toHaveCount(9)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
      })
    }
    for (const scenario of [
      'coupon-expired',
      'account-validation',
      'favorites-failure',
      'connection-refused',
    ] as const satisfies readonly Scenario[]) {
      test(`executa a ação de ${scenario} e mantém o aviso após recarregar`, async ({
        page,
      }) => {
        const labels = messages[language].demo
        const { dialog } = await openDemo(page, language)
        await dialog
          .getByRole('combobox', { name: labels.guidedScenario, exact: true })
          .selectOption(scenario)
        await dialog
          .getByRole('button', { name: labels.guidedStart, exact: true })
          .click()
        await expect(page).toHaveURL(demoDestination(scenario))
        const banner = page.getByRole('region', {
          name: labels.activeTitle,
          exact: true,
        })
        await expect(banner.getByRole('status')).toContainText(/(API)/)
        const status = {
          'coupon-expired': 422,
          'account-validation': 422,
          'favorites-failure': 503,
          'connection-refused': 409,
        }[scenario]
        await expect(banner.getByRole('status')).toContainText(String(status))
        await page.reload()
        await waitForAppReady(page)
        await expect(banner).toBeVisible()
        await banner
          .getByRole('button', { name: labels.exitDemo, exact: true })
          .click()
        await expect(page.locator('.catalog-grid article')).toHaveCount(9)
      })
    }
  })
}

test('prepara todos os cenários com contrato válido e rejeita opções desconhecidas', async ({
  page,
}) => {
  await visit(page, '/')
  const generations = new Set<string>()
  for (const scenario of scenarios) {
    const response = await cartRequest(page, '/demo/start', 'POST', {
      scenario,
    })
    expect(response.status, scenario).toBe(200)
    const status = demoStatusSchema.parse(response.body)
    expect(status.scenario).toBe(scenario)
    expect(generations.has(status.generation)).toBe(false)
    generations.add(status.generation)
  }
  const invalid = await cartRequest(page, '/demo/start', 'POST', {
    scenario: 'unknown',
  })
  expect(invalid.status).toBe(422)
})
