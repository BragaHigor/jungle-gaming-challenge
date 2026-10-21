import { test, expect, type Page } from '@playwright/test'
import { visit } from './helpers/navigation'
import { signInFixture, submitLogin } from './helpers/auth'
import { readMockStorage } from './helpers/storage'

test('mantém o cabeçalho autenticado sem quebra de rótulo ou sobreposição nos breakpoints desktop', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  for (const locale of ['pt-BR', 'en']) {
    await page.addInitScript(
      (language) => localStorage.setItem('kurio-language', language),
      locale,
    )
    await visit(page, '/')
    for (const width of [1100, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const account = await page.locator('.header-login').boundingBox()
      expect(account!.height).toBeLessThan(45)
      const nav = await page.locator('.desktop-navigation').boundingBox()
      const actions = await page.locator('.site-header__actions').boundingBox()
      expect(nav!.x + nav!.width).toBeLessThanOrEqual(actions!.x)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
  }
})

async function call(
  page: Page,
  path: string,
  method = 'GET',
  body?: unknown,
  token?: string | null,
) {
  return page.evaluate(
    async ({ path, method, body, token }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: response.status, body: await response.json() }
    },
    { path, method, body, token },
  )
}

test('expira a sessão pelo relógio mesmo sem receber uma resposta HTTP 401', async ({
  page,
}) => {
  await page.clock.install()
  await visit(page, '/')
  await signInFixture(page)
  await visit(page, '/profile')
  await expect(
    page.getByRole('textbox', { name: 'Nome de usuário', exact: true }),
  ).toHaveValue('colecionador')
  await page.clock.fastForward(3601000)
  await expect(page).toHaveURL(/\/login\?redirect=.*reason=expired/)
  await expect(page.getByRole('alert')).toHaveText('Sua sessão expirou')
  expect(
    await page.evaluate(() => sessionStorage.getItem('kurio-session')),
  ).toBeNull()
  await submitLogin(page)
  await expect(page).toHaveURL('/profile')
})

test('limita cenários privados à sessão atual e mantém as demais sessões válidas', async ({
  page,
  context,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  const tokenA = await page.evaluate(() =>
    sessionStorage.getItem('kurio-session'),
  )
  const other = await context.newPage()
  await visit(other, '/')
  await signInFixture(other)
  const tokenB = await other.evaluate(() =>
    sessionStorage.getItem('kurio-session'),
  )
  expect(tokenA).not.toBe(tokenB)
  expect(
    (await call(page, '/demo/reset', 'POST', { scenario: 'session-expired' }))
      .status,
  ).toBe(401)
  expect(
    (
      await call(
        page,
        '/demo/reset',
        'POST',
        { scenario: 'session-expired' },
        tokenA,
      )
    ).status,
  ).toBe(200)
  expect((await call(page, '/session', 'GET', undefined, tokenA)).status).toBe(
    401,
  )
  expect((await call(other, '/session', 'GET', undefined, tokenB)).status).toBe(
    200,
  )
  expect(
    (await call(other, '/favorites', 'POST', { nftId: 'emerald-ape-042' }))
      .status,
  ).toBe(401)
  expect(
    (
      await call(
        other,
        '/favorites',
        'POST',
        { nftId: 'emerald-ape-042', userId: 'collector-b' },
        tokenB,
      )
    ).status,
  ).toBe(422)
  expect(
    (await call(other, '/favorites', 'POST', { nftId: 'inexistente' }, tokenB))
      .status,
  ).toBe(404)
  const snapshot = await readMockStorage(page)
  expect(snapshot.users).toHaveLength(2)
  expect(snapshot.favorites).toEqual({})
})

test('resolve cadastros concorrentes com conflito sem duplicar usuários', async ({
  page,
  context,
}) => {
  await visit(page, '/')
  const other = await context.newPage()
  await visit(other, '/')
  const results = await Promise.all(
    [page, other].map((tab, index) =>
      call(tab, '/auth/register', 'POST', {
        username: 'NovoUsuario',
        email: `novo${index}@kurio.demo`,
        password: 'Kurio@2026',
        confirm: 'Kurio@2026',
      }),
    ),
  )
  expect(results.map((result) => result.status).sort()).toEqual([200, 409])
  expect(results.find((result) => result.status === 409)?.body).toMatchObject({
    error: { code: 'CONFLICT', fields: { username: 'usernameTaken' } },
  })
  expect((await readMockStorage(page)).users).toHaveLength(3)
})

test('traduz erros remotos e a consulta de favoritos para inglês', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('kurio-language', 'en'))
  await visit(page, '/login')
  await submitLogin(page, 'inexistente@kurio.demo')
  await expect(page.getByRole('alert')).toHaveText(
    'Incorrect email or password.',
  )
  await submitLogin(page)
  await expect(page).toHaveURL('/')
  await page
    .getByRole('button', { name: 'Favorites', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(
    page
      .getByRole('dialog', { name: 'Favorites', exact: true })
      .getByText('You have no favorites yet.', { exact: true }),
  ).toBeVisible()
})

test('trata HTTP 401 dos favoritos preservando busca e posição de retorno na URL', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  const route = '/?q=Emerald#marketplace'
  await visit(page, route)
  const token = await page.evaluate(() =>
    sessionStorage.getItem('kurio-session'),
  )
  expect(
    (
      await call(
        page,
        '/demo/reset',
        'POST',
        { scenario: 'session-expired' },
        token,
      )
    ).status,
  ).toBe(200)
  await page
    .locator('.catalog-grid article')
    .first()
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/login\?redirect=.*reason=expired/)
  expect(new URL(page.url()).searchParams.get('redirect')).toBe(route)
  await submitLogin(page)
  await expect(page).toHaveURL(route)
})

test('fecha favoritos com retorno do foco e descarta uma mutation pendente após logout', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  const token = await page.evaluate(() =>
    sessionStorage.getItem('kurio-session'),
  )
  await call(page, '/favorites', 'POST', { nftId: 'emerald-ape-042' }, token)
  await visit(page, '/profile')
  const trigger = page.getByRole('button', {
    name: 'Lista de interesse',
    exact: true,
  })
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Favoritos', exact: true })
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/favorites') && r.request().method() === 'DELETE',
  )
  await dialog
    .getByRole('button', {
      name: 'Remover Emerald Ape #042 dos favoritos',
      exact: true,
    })
    .click()
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', { name: 'Sair', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL('/')
  await response
  await expect(page.getByRole('alert')).toHaveCount(0)
  await visit(page, '/wallets')
  await submitLogin(page, 'visitante@kurio.demo')
  await expect(page).toHaveURL('/wallets')
  await expect(page.getByRole('alert')).toHaveCount(0)
  const current = await page.evaluate(() =>
    sessionStorage.getItem('kurio-session'),
  )
  expect(
    (await call(page, '/favorites', 'GET', undefined, current)).body.nftIds,
  ).toEqual([])
})
