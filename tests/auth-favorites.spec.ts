import { test, expect, type Page } from '@playwright/test'
import { visit, waitForAppReady } from './helpers/navigation'
import { signInFixture, submitLogin } from './helpers/auth'
import { readMockStorage } from './helpers/storage'

async function request(
  page: Page,
  path: string,
  method = 'GET',
  body?: unknown,
) {
  await waitForAppReady(page)
  return page.evaluate(
    async ({ path, method, body }) => {
      const token = sessionStorage.getItem('kurio-session')
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
    { path, method, body },
  )
}
async function openFavorites(page: Page) {
  const trigger = page
    .getByRole('button', { name: 'Favoritos', exact: true })
    .filter({ visible: true })
    .first()
  await trigger.click()
  return page.getByRole('dialog', { name: 'Favoritos', exact: true })
}
async function scenario(page: Page, name: string) {
  const trigger = page
    .getByRole('button', { name: 'Demonstração', exact: true })
    .filter({ visible: true })
    .first()
  await trigger.click()
  const dialog = page.getByRole('dialog', {
    name: 'Controle da demonstração',
    exact: true,
  })
  await dialog
    .getByRole('combobox', { name: 'Cenário', exact: true })
    .selectOption(name)
  await dialog
    .getByRole('button', { name: 'Aplicar cenário', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
}

test('protege rotas privadas, retorna ao checkout e recupera a sessão após refresh', async ({
  page,
}) => {
  await visit(page, '/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await submitLogin(page)
  await expect(page).toHaveURL('/checkout')
  await page.reload()
  await expect(page).toHaveURL('/checkout')
  expect((await request(page, '/session')).body.user.id).toBe('collector-a')
  for (const route of ['/profile', '/wallets', '/confirmation']) {
    await visit(page, route)
    await expect(page).toHaveURL(route)
  }
})

test('rejeita credenciais incorretas, mostra erro e permite tentar novamente', async ({
  page,
}) => {
  await visit(page, '/login')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('ninguem@kurio.demo')
  await page.getByLabel(/^Senha\s*\*?$/).fill('Kurio@2026')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'E-mail ou senha incorretos.',
  )
  await expect(page.getByLabel(/^Senha\s*\*?$/)).toHaveValue('')
  expect(
    await page.evaluate(() => sessionStorage.getItem('kurio-session')),
  ).toBeNull()
  await submitLogin(page)
  await expect(page).toHaveURL('/')
})

test('cadastra usuário com hash, trata conflitos e não persiste senhas em claro', async ({
  page,
}) => {
  await visit(page, '/register?redirect=%2Fprofile')
  await page
    .getByRole('textbox', { name: 'Nome de usuário', exact: true })
    .fill('Higor')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('colecionador@kurio.demo')
  await page.getByLabel(/^Senha\s*\*?$/).fill('SenhaFicticia123')
  await page.getByLabel(/^Confirmar senha\s*\*?$/).fill('SenhaFicticia123')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(
    page.getByText('Este e-mail já está cadastrado.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('higor@kurio.demo')
  await page.getByLabel(/^Senha\s*\*?$/).fill('SenhaFicticia123')
  await page.getByLabel(/^Confirmar senha\s*\*?$/).fill('SenhaFicticia123')
  await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page).toHaveURL('/profile')
  const stored = await readMockStorage(page)
  expect(JSON.stringify(stored)).not.toContain('SenhaFicticia123')
  expect(stored.users).toHaveLength(3)
  expect((await request(page, '/session')).body.user.username).toBe('Higor')
  const browserStorage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  )
  expect(browserStorage).not.toContain('SenhaFicticia123')
  await visit(page, '/login')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('higor@kurio.demo')
  await page.getByLabel(/^Senha\s*\*?$/).fill('SenhaFicticia123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/')
})

test('mantém o retorno seguro ao alternar login e cadastro e bloqueia URL externa', async ({
  page,
}) => {
  await visit(page, '/profile')
  await page
    .getByRole('link', { name: /^(Criar conta|Novo na Kurio.*)$/ })
    .click()
  await expect(page).toHaveURL(/\/register\?redirect=/)
  await page
    .getByRole('link', { name: /^(Entrar|Já tem uma conta.*)$/ })
    .filter({ visible: true })
    .click()
  await submitLogin(page)
  await expect(page).toHaveURL('/profile')
  await visit(page, '/login?redirect=https%3A%2F%2Fexample.com')
  await submitLogin(page)
  await expect(page).toHaveURL('/')
})

test('retorna ao NFT após login, atualiza favoritos otimistas e persiste após refresh', async ({
  page,
}) => {
  await visit(page, '/nfts/emerald-ape-042')
  const favorite = page
    .getByRole('button', { name: 'Favoritar Emerald Ape #042', exact: true })
    .filter({ visible: true })
    .first()
  await favorite.click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await submitLogin(page)
  await expect(page).toHaveURL('/nfts/emerald-ape-042')
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/favorites') && r.request().method() === 'POST',
  )
  await favorite.click()
  const selected = page
    .getByRole('button', {
      name: 'Remover Emerald Ape #042 dos favoritos',
      exact: true,
    })
    .filter({ visible: true })
    .first()
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  await expect(selected).toBeDisabled()
  expect((await response).status()).toBe(200)
  await expect(selected).toBeEnabled()
  await page.reload()
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  await visit(page, '/')
  const dialog = await openFavorites(page)
  await expect(dialog.getByRole('link', { name: /Emerald Ape/ })).toBeVisible()
  await dialog
    .getByRole('button', {
      name: 'Remover Emerald Ape #042 dos favoritos',
      exact: true,
    })
    .click()
  await expect(
    dialog.getByText('Você ainda não tem favoritos.', { exact: true }),
  ).toBeVisible()
})

test('faz rollback na falha de favoritos e recupera sem apagar a sessão', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  await page.reload()
  await scenario(page, 'favorites-failure')
  const card = page.locator('.catalog-grid article').first()
  const button = card.getByRole('button')
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível atualizar os favoritos.',
  )
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  expect((await request(page, '/favorites')).body.nftIds).toEqual([])
  await page
    .getByRole('alert')
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await scenario(page, 'favorites-ready')
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/favorites') &&
      response.request().method() === 'POST' &&
      response.ok(),
  )
  await button.click()
  await saved
  await expect(button).toBeEnabled()
  expect((await request(page, '/favorites')).body.nftIds).toEqual([
    'emerald-ape-042',
  ])
})

test('expira apenas a sessão atual durante checkout e retoma após autenticar', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  await page.reload()
  await visit(page, '/checkout')
  await page
    .getByRole('button', { name: 'Abrir menu', exact: true })
    .filter({ visible: true })
    .count()
    .then(async (count) => {
      if (count)
        await page
          .getByRole('button', { name: 'Abrir menu', exact: true })
          .filter({ visible: true })
          .click()
    })
  if (
    !(await page
      .getByRole('button', { name: 'Demonstração', exact: true })
      .filter({ visible: true })
      .count())
  ) {
    await request(page, '/demo/reset', 'POST', { scenario: 'session-expired' })
    await page.reload()
  } else {
    await scenario(page, 'session-expired')
  }
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await submitLogin(page)
  await expect(page).toHaveURL('/checkout')
})

test('revoga sessão no logout e isola favoritos ao trocar de usuário', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  await page.reload()
  const token = await page.evaluate(() =>
    sessionStorage.getItem('kurio-session'),
  )
  await request(page, '/favorites', 'POST', { nftId: 'emerald-ape-042' })
  await visit(page, '/profile')
  await page
    .getByRole('button', { name: 'Sair', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL('/')
  await expect
    .poll(async () =>
      ((await readMockStorage(page)).sessions as { token: string }[]).some(
        (value) => value.token === token,
      ),
    )
    .toBe(false)
  await visit(page, '/wallets')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await submitLogin(page, 'visitante@kurio.demo')
  await expect(page).toHaveURL('/wallets')
  expect((await request(page, '/favorites')).body.nftIds).toEqual([])
  await visit(page, '/')
  const dialog = await openFavorites(page)
  await expect(
    dialog.getByText('Você ainda não tem favoritos.', { exact: true }),
  ).toBeVisible()
})
