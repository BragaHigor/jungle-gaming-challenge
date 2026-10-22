import { test, expect } from '@playwright/test'
import { visit, waitForAppReady } from './helpers/navigation'
import { visitWithAccount } from './helpers/auth'
import { cartRequest } from './helpers/cart'
import { seedWallets } from './helpers/account'
import { fillCollector } from './helpers/purchase'
import { seedPendingOrder } from './helpers/orders'
import { languages, messages, openDemo, useLanguage } from './helpers/demo'

for (const language of languages) {
  test.describe(`Demonstração integrada em ${language}`, () => {
    test.beforeEach(async ({ page }) => {
      await useLanguage(page, language)
    })

    test('aplica falhas e vazio na página e restaura dados idioma e foco', async ({
      page,
    }) => {
      const text = messages[language]
      await visit(page, '/')
      await expect(page.locator('.catalog-grid article')).toHaveCount(9)
      for (const scenario of ['server-error', 'malformed-response', 'empty']) {
        const { dialog, trigger, labels } = await openDemo(page, language)
        await dialog
          .getByRole('combobox', { name: labels.scenario, exact: true })
          .selectOption(scenario)
        const response = page.waitForResponse(
          (response) => new URL(response.url()).pathname === '/api/demo/reset',
        )
        await dialog
          .getByRole('button', { name: labels.apply, exact: true })
          .click()
        expect((await response).status()).toBe(200)
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        const title =
          scenario === 'empty'
            ? text.catalog.emptyTitle
            : text.catalog.errorTitle
        await expect(
          page.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible()
        await expect(page.locator('.catalog-grid article')).toHaveCount(0)
        const controls = await openDemo(page, language)
        await expect(
          controls.dialog.getByRole('combobox', {
            name: labels.scenario,
            exact: true,
          }),
        ).toHaveValue(scenario)
        await controls.dialog
          .getByRole('button', { name: labels.reset, exact: true })
          .click()
        await expect(controls.dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        await expect(page.locator('.catalog-grid article')).toHaveCount(9)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
      }
      await page.reload()
      await expect(page.locator('.catalog-grid article')).toHaveCount(9)
      await expect(page.locator('html')).toHaveAttribute('lang', language)
    })

    test('oferece somente cenários pertinentes à rota e à sessão', async ({
      page,
    }) => {
      const routes = [
        {
          path: '/',
          included: 'empty',
          excluded: [
            'order-pending',
            'account-slow',
            'cart-price-change',
            'session-expired',
          ],
        },
        {
          path: '/cart',
          included: 'cart-price-change',
          excluded: ['empty', 'order-pending', 'account-slow'],
        },
        {
          path: '/wallets',
          included: 'account-slow',
          excluded: ['empty', 'cart-price-change', 'order-pending'],
        },
        {
          path: '/checkout',
          included: 'order-pending',
          excluded: ['empty', 'account-slow'],
        },
        {
          path: '/confirmation',
          included: 'order-read-failure',
          excluded: ['empty', 'account-slow', 'cart-price-change'],
        },
      ]
      for (const { path, included, excluded } of routes) {
        await visitWithAccount(page, path)
        const { dialog, trigger, labels } = await openDemo(page, language)
        const options = await dialog
          .getByRole('combobox', { name: labels.scenario, exact: true })
          .locator('option')
          .evaluateAll((elements) =>
            elements.map((element) => (element as HTMLOptionElement).value),
          )
        expect(options).toContain(included)
        for (const option of excluded) expect(options).not.toContain(option)
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
      }
      expect((await cartRequest(page, '/orders')).body).toEqual([])
    })

    test('trata NFT inexistente pela API e oferece retorno ao catálogo', async ({
      page,
    }) => {
      const response = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/nfts/nft-inexistente',
      )
      await visit(page, '/nfts/nft-inexistente')
      expect((await response).status()).toBe(404)
      await expect(
        page.getByRole('heading', {
          name: messages[language].catalog.unavailableTitle,
          exact: true,
        }),
      ).toBeVisible()
      await expect(
        page.getByRole('main').getByRole('button', {
          name: new RegExp(messages[language].detail.buy, 'i'),
        }),
      ).toHaveCount(0)
      await page
        .getByRole('button', {
          name: messages[language].catalog.retry,
          exact: true,
        })
        .click()
      await expect(page).toHaveURL('/')
      await expect(page.locator('.catalog-grid article')).toHaveCount(9)
    })
  })
}

test('conclui a compra em inglês do catálogo ao recibo e preserva idioma no refresh', async ({
  page,
}) => {
  await useLanguage(page, 'en')
  await visitWithAccount(page, '/profile')
  await seedWallets(page)
  await visit(page, '/')
  await page
    .getByRole('link', { name: 'View Emerald Ape #042', exact: true })
    .first()
    .click()
  await page
    .getByRole('button', { name: /^BUY/i })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL('/cart')
  await page
    .getByRole('link', { name: messages.en.purchase.checkout, exact: true })
    .click()
  const review = await fillCollector(page, 'en')
  await review
    .getByRole('button', {
      name: messages.en.purchase.connectWallet,
      exact: true,
    })
    .click()
  await review
    .getByRole('button', { name: messages.en.purchase.confirm, exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: messages.en.purchase.confirmed,
      exact: true,
    }),
  ).toBeVisible()
  const saved = (await cartRequest(page, '/orders')).body
  expect(saved).toHaveLength(1)
  await page.reload()
  await waitForAppReady(page)
  await expect(
    page.getByRole('heading', {
      name: messages.en.purchase.confirmed,
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect((await cartRequest(page, '/orders')).body).toEqual(saved)
  expect((await cartRequest(page)).body.items).toEqual([])
})

test('estoque esgotado por evento bloqueia revisão aberta sem criar pedido', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  const review = await fillCollector(page)
  await review
    .getByRole('button', {
      name: messages['pt-BR'].purchase.connectWallet,
      exact: true,
    })
    .click()
  const confirm = review.getByRole('button', {
    name: messages['pt-BR'].purchase.confirm,
    exact: true,
  })
  await expect(confirm).toBeEnabled()
  expect(
    (
      await cartRequest(page, '/demo/reset', 'POST', {
        scenario: 'cart-stock-change',
      })
    ).status,
  ).toBe(200)
  await expect(confirm).toBeDisabled()
  await expect(review.getByRole('alert').first()).toBeVisible()
  await review
    .getByRole('link', {
      name: messages['pt-BR'].purchase.backToCart,
      exact: true,
    })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    messages['pt-BR'].purchase.stockChanged,
  )
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  expect((await cartRequest(page)).body.items).toHaveLength(3)
})

test('reset integral cancela pagamento agendado e impede efeitos da geração anterior', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-21T12:00:00Z') })
  const pending = await seedPendingOrder(page, 'order-declined')
  expect(pending.status).toBe('pending')
  await visit(page, '/')
  const { dialog, labels } = await openDemo(page)
  await dialog.getByRole('button', { name: labels.reset, exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.catalog-grid article').first()).toContainText(
    '1.19 ETH',
  )
  await page.clock.fastForward(5000)
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  const nft = (await cartRequest(page, '/nfts/emerald-ape-042')).body
  expect(nft).toMatchObject({ price: '1.19', version: 1 })
  expect(
    nft.editions.find((edition: { id: string }) => edition.id === '1/50')
      .available,
  ).toBe(50)
  expect((await cartRequest(page, '/session')).status).toBe(401)
  expect((await cartRequest(page, `/orders/${pending.id}`)).status).toBe(401)
  await expect(
    page.getByRole('heading', {
      name: messages['pt-BR'].purchase.confirmed,
      exact: true,
    }),
  ).toHaveCount(0)
})

test('resumo lento mantém dimensões e comunica atualização com movimento reduzido', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await visitWithAccount(page, '/checkout')
  await visit(page, '/cart')
  const summary = page.getByRole('region', {
    name: messages['pt-BR'].purchase.summary,
    exact: true,
  })
  await expect(summary).toHaveAttribute('aria-busy', 'false')
  const height = (await summary.boundingBox())!.height
  const { dialog, labels } = await openDemo(page)
  await dialog
    .getByRole('combobox', { name: labels.scenario, exact: true })
    .selectOption('cart-slow')
  await dialog.getByRole('button', { name: labels.apply, exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(summary).toHaveAttribute('aria-busy', 'false')
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .first()
    .click()
  await expect(summary).toHaveAttribute('aria-busy', 'true')
  const skeleton = summary.locator('[data-slot=skeleton]').first()
  await expect(skeleton).toBeVisible()
  await expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  expect(
    await skeleton.evaluate(
      (element) => getComputedStyle(element, '::after').animationName,
    ),
  ).toBe('none')
  expect((await summary.boundingBox())!.height).toBeCloseTo(height, 0)
  await expect(summary.locator('dl')).toHaveAttribute('aria-live', 'polite')
  await expect(summary).toHaveAttribute('aria-busy', 'false')
  expect((await summary.boundingBox())!.height).toBeCloseTo(height, 0)
  expect((await cartRequest(page)).body.items[0].quantity).toBe(3)
})
