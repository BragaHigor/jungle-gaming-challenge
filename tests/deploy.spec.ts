import { expect, test } from '@playwright/test'
import { visit } from './helpers/navigation'

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
    dialog.getByText('36 NFTs disponíveis', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  const catalog = dialog.getByRole('region', { name: 'Catálogo', exact: true })
  await expect(catalog.getByText('1.19 ETH', { exact: true })).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Alterar NFT de referência', exact: true })
    .click()
  await expect(catalog.getByText('1.2 ETH', { exact: true })).toBeVisible()
  await expect(catalog.getByText('Revisão 2', { exact: true })).toBeVisible()
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
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('36 NFTs available', { exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
