import { expect, test } from '@playwright/test'
import { visit } from './helpers/navigation'
import { visitWithAccount } from './helpers/auth'
import { cartRequest } from './helpers/cart'
import { fillCollector } from './helpers/purchase'

test('conclui compra simulada e recupera o recibo após refresh', async ({
  page,
}) => {
  await visitWithAccount(page, '/checkout')
  expect(
    (
      await cartRequest(page, '/demo/reset', 'POST', {
        scenario: 'order-confirmed',
      })
    ).status,
  ).toBe(200)
  const review = await fillCollector(page)
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await review
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(page).toHaveURL(/confirmation\?orderId=/)
  const confirmation = page.getByRole('heading', {
    name: 'Seus NFTs agora estão na sua carteira',
    exact: true,
  })
  await expect(confirmation).toBeVisible()
  const orders = (await cartRequest(page, '/orders')).body
  expect(orders).toHaveLength(1)
  expect((await cartRequest(page)).body.items).toEqual([])
  await page.reload()
  await expect(confirmation).toBeVisible()
  expect((await cartRequest(page, `/orders/${orders[0].id}`)).body).toEqual(
    orders[0],
  )
})

test('publica o SHA esperado, os mocks e o worker como JavaScript', async ({
  request,
}) => {
  const response = await request.get('/deployment.json')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('application/json')
  expect(await response.json()).toEqual({
    sha: process.env.DEPLOY_SHA ?? process.env.GITHUB_SHA ?? 'local',
    mocksEnabled: true,
  })
  const worker = await request.get('/mockServiceWorker.js')
  expect(worker.ok()).toBe(true)
  expect(worker.headers()['content-type']).toMatch(/javascript/)
  expect(await worker.text()).toContain('Mock Service Worker')
})

test('abre rotas diretamente, permite refresh e carrega artes e fontes locais', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const authTitles: Record<string, string> = {
    '/login': 'Entrar',
    '/register': 'Criar perfil de colecionador',
  }
  for (const path of [
    '/',
    '/nfts/emerald-ape-042',
    '/cart',
    '/login',
    '/register',
  ]) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('.site-layout')).toBeVisible()
    await expect(page).toHaveURL(path)
    await page.reload()
    await expect(page.locator('.site-layout')).toBeVisible()
    const authTitle = authTitles[path]
    const surface = authTitle
      ? page.getByRole('dialog', { name: authTitle, exact: true })
      : page.getByRole('main')
    await expect(surface).toBeVisible()
  }
  await visit(page, '/')
  expect(
    await page.evaluate(() => document.fonts.check('16px "Roboto Mono"')),
  ).toBe(true)
  const artwork = page.locator('.catalog-grid img').first()
  await artwork.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      artwork.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true)
  expect(errors).toEqual([])
})

test('consulta REST e atualiza o NFT pelo Socket.IO no endereço publicado', async ({
  page,
}) => {
  await visit(page, '/')
  await page
    .getByRole('contentinfo')
    .getByRole('button', { name: 'Demonstração', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Controle da demonstração',
    exact: true,
  })
  await expect(
    page.getByText('36 NFTs encontrados', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  const catalog = page.locator('.catalog-grid article').first()
  await expect(catalog.getByText('1.19 ETH', { exact: true })).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Alterar NFT de referência', exact: true })
    .click()
  await expect(catalog.getByText('1.2 ETH', { exact: true })).toBeVisible()
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  await page.reload()
  await page
    .getByRole('contentinfo')
    .getByRole('button', { name: 'Demonstração', exact: true })
    .click()
  await expect(catalog.getByText('1.2 ETH', { exact: true })).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Restaurar demonstração', exact: true })
    .click()
  await expect(catalog.getByText('1.19 ETH', { exact: true })).toBeVisible()
})

test('mantém a tradução em inglês após atualizar a página publicada', async ({
  page,
}) => {
  await visit(page, '/')
  await page.evaluate(() => localStorage.setItem('kurio-language', 'en'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page
    .getByRole('contentinfo')
    .getByRole('button', { name: 'Demonstration', exact: true })
    .click()
  await expect(page.getByText('36 NFTs found', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
