import { signInFixture } from './helpers/auth'
import { readMockStorage, corruptMockStorage } from './helpers/storage'
import { visit } from './helpers/navigation'
import { expect, test, type Page } from '@playwright/test'
import { ethSchema } from '../src/schemas/api/common'
import { ethToWei, weiToEth } from '../src/utils/eth'

const openDemo = async (page: Page) => {
  await visit(page, '/')
  await page.getByRole('button', { name: 'Demonstração', exact: true }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Controle da demonstração',
    exact: true,
  })
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  return dialog
}

test('consulta por Axios e recebe atualização de NFT pelo Socket.IO', async ({
  page,
}) => {
  const dialog = await openDemo(page)
  await expect(
    page.getByText('36 NFTs encontrados', { exact: true }),
  ).toBeVisible()
  const catalog = page.locator('.catalog-grid article').first()
  await expect(catalog.getByText('1.19 ETH', { exact: true })).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Alterar NFT de referência', exact: true })
    .click()
  await expect(catalog.getByText('1.2 ETH', { exact: true })).toBeVisible()
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  await expect(
    dialog.getByText('Última atualização: Catálogo', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Demonstração', exact: true }).click()
  await expect(catalog.getByText('1.2 ETH', { exact: true })).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Restaurar demonstração', exact: true })
    .click()
  await expect(catalog.getByText('1.19 ETH', { exact: true })).toBeVisible()
})

const browserRequest = async <T = unknown>(
  page: Page,
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
) => {
  await expect(page.locator('.site-layout')).toBeVisible()
  return page.evaluate(
    async ({ path, options }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (options.token) headers.Authorization = `Bearer ${options.token}`
      const response = await fetch(`/api${path}`, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      return { status: response.status, body: (await response.json()) as T }
    },
    { path, options },
  )
}

const selectScenario = async (
  dialog: ReturnType<Page['getByRole']>,
  scenario: string,
) => {
  await dialog
    .getByRole('combobox', { name: 'Cenário', exact: true })
    .selectOption(scenario)
  const applied = dialog
    .page()
    .waitForResponse(
      (response) =>
        response.url().endsWith('/api/demo/reset') &&
        response.request().method() === 'POST',
    )
  await dialog
    .getByRole('button', { name: 'Aplicar cenário', exact: true })
    .click()
  expect((await applied).ok()).toBe(true)
  await expect(dialog).not.toBeVisible()
  await dialog
    .page()
    .getByRole('button', { name: 'Demonstração', exact: true })
    .click()
  await expect(
    dialog.getByRole('combobox', { name: 'Cenário', exact: true }),
  ).toBeEnabled()
}

test('combina filtros, pagina e ordena pelo contrato REST', async ({
  page,
}) => {
  await visit(page, '/')
  const result = await browserRequest<{
    items: { network: string; category: string; price: string }[]
    total: number
  }>(
    page,
    '/nfts?networks=Polygon&categories=music&sort=lowest&pageSize=2&page=1',
  )
  expect(result.status).toBe(200)
  expect(result.body.total).toBeGreaterThan(2)
  expect(result.body.items).toHaveLength(2)
  expect(
    result.body.items.every(
      (nft) => nft.network === 'Polygon' && nft.category === 'music',
    ),
  ).toBe(true)
  expect(
    ethToWei(result.body.items[0].price) <=
      ethToWei(result.body.items[1].price),
  ).toBe(true)
  const invalid = await browserRequest(page, '/nfts?page=1.5')
  expect(invalid.status).toBe(422)
  expect(invalid.body).toMatchObject({ error: { code: 'VALIDATION' } })
  expect((await browserRequest(page, '/nfts?min=2&max=1')).status).toBe(422)
  expect((await browserRequest(page, '/nfts/inexistente')).status).toBe(404)
})

test('rejeita payloads inválidos sem alterar o banco nem confirmar uma operação', async ({
  page,
}) => {
  await visit(page, '/')
  for (const quantity of [0, -1, 1.5, '2', 100]) {
    const result = await browserRequest(page, '/cart/items', {
      method: 'POST',
      body: { nftId: 'emerald-ape-042', editionId: '1/50', quantity },
    })
    expect(result.status).toBe(422)
  }
  const unknownField = await browserRequest(page, '/cart/items', {
    method: 'POST',
    body: {
      nftId: 'emerald-ape-042',
      editionId: '1/50',
      quantity: 1,
      price: '0',
    },
  })
  expect(unknownField.status).toBe(422)
  const valid = await browserRequest(page, '/cart/items', {
    method: 'POST',
    body: { nftId: 'emerald-ape-042', editionId: '1/50', quantity: 1 },
  })
  expect(valid.status).toBe(200)
  expect((await browserRequest(page, '/cart')).body).toMatchObject({
    items: [{ nftId: 'emerald-ape-042', editionId: '1/50', quantity: 1 }],
    version: 2,
  })
})

test('isola pedido, perfil, carteiras e sessão das duas contas fictícias', async ({
  page,
}) => {
  await visit(page, '/')
  await browserRequest(page, '/demo/reset', {
    method: 'POST',
    body: { scenario: 'pending-order' },
  })
  const tokenA = 'demo-pending-session-token'
  const tokenB = 'demo-other-session-token'
  const own = await browserRequest(page, '/orders/order-demo-pending', {
    token: tokenA,
  })
  expect(own.status).toBe(200)
  expect(own.body).toMatchObject({
    userId: 'collector-a',
    status: 'pending',
    reference: null,
  })
  const other = await browserRequest(page, '/orders/order-demo-pending', {
    token: tokenB,
  })
  expect(other.status).toBe(403)
  expect(other.body).toEqual({ error: { code: 'FORBIDDEN' } })
  expect(
    (await browserRequest(page, '/orders/order-demo-pending')).status,
  ).toBe(401)
  const profile = await browserRequest(page, '/profile', { token: tokenB })
  expect(profile.body).toMatchObject({
    id: 'collector-b',
    username: 'visitante',
  })
  expect(
    (await browserRequest(page, '/wallets', { token: tokenB })).body,
  ).toEqual([])
  const session = await browserRequest(page, '/session', { token: tokenA })
  expect(session.body).toMatchObject({ user: { id: 'collector-a' } })
  expect(JSON.stringify(session.body)).not.toMatch(
    /passwordHash|salt|iterations/,
  )
  await browserRequest(page, '/demo/reset', {
    method: 'POST',
    body: { scenario: 'default' },
  })
  expect(
    (await browserRequest(page, '/profile', { token: tokenA })).status,
  ).toBe(401)
})

test('recebe order.updated e mantém o pedido pendente sem inventar confirmação', async ({
  page,
}) => {
  await visit(page, '/')
  await browserRequest(page, '/demo/reset', {
    method: 'POST',
    body: { scenario: 'pending-order' },
  })
  await signInFixture(page)
  const dialog = await openDemo(page)
  const order = dialog.getByRole('region', { name: 'Pedido', exact: true })
  await expect(order.getByText('Revisão 1', { exact: true })).toBeVisible()
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Atualizar pedido pendente', exact: true })
    .click()
  await expect(order.getByText('Revisão 2', { exact: true })).toBeVisible()
  await expect(
    dialog.getByText('Última atualização: Pedido', { exact: true }),
  ).toBeVisible()
  expect(
    (
      await browserRequest(page, '/orders/order-demo-pending', {
        token: 'demo-pending-session-token',
      })
    ).body,
  ).toMatchObject({ status: 'pending', version: 2, reference: null })
})

test('recusa resposta malformada e recupera o catálogo após reset', async ({
  page,
}) => {
  const dialog = await openDemo(page)
  await selectScenario(dialog, 'malformed-response')
  await expect(page.locator('main [role=alert]')).toContainText(
    'A resposta recebida é inválida.',
  )
  await expect(page.locator('.catalog-grid article').first()).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Restaurar demonstração', exact: true })
    .click()
  await expect(
    page.getByText('36 NFTs encontrados', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('main [role=alert]')).toHaveCount(0)
})

test('descarta evento inválido sem atualizar parcialmente o recurso', async ({
  page,
}) => {
  const dialog = await openDemo(page)
  await selectScenario(dialog, 'malformed-event')
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Alterar NFT de referência', exact: true })
    .click()
  await expect(
    dialog.getByText('1 atualização inválida ignorada', { exact: true }),
  ).toBeVisible()
  const catalog = page.locator('.catalog-grid article').first()
  await expect(catalog.getByText('1.19 ETH', { exact: true })).toBeVisible()
  await expect(page.locator('.catalog-grid article')).toHaveCount(9)
  expect(
    (await browserRequest(page, '/nfts/emerald-ape-042')).body,
  ).toMatchObject({ price: '1.19', version: 1 })
  await dialog
    .getByRole('button', { name: 'Restaurar demonstração', exact: true })
    .click()
  await expect(
    dialog.getByText('1 atualização inválida ignorada', { exact: true }),
  ).toHaveCount(0)
})

test('recupera falhas HTTP, de conexão e timeout pelo controle de cenários', async ({
  page,
}) => {
  test.setTimeout(45000)
  const dialog = await openDemo(page)
  for (const scenario of [
    'server-error',
    'unauthorized',
    'forbidden',
    'offline',
    'timeout',
  ]) {
    await selectScenario(dialog, scenario)
    await expect(page.locator('main [role=alert]')).toContainText(
      'Não foi possível carregar os NFTs.',
      { timeout: 10000 },
    )
    await dialog
      .getByRole('button', { name: 'Restaurar demonstração', exact: true })
      .click()
    await expect(
      page.getByText('36 NFTs encontrados', { exact: true }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Demonstração', exact: true })
      .click()
  }
})

test('mostra carregamento lento e reproduz respostas fora de ordem', async ({
  page,
}) => {
  const dialog = await openDemo(page)
  await selectScenario(dialog, 'slow')
  await expect(page.locator('.catalog-main [aria-busy=true]')).toBeVisible()
  await expect(
    page.getByText('36 NFTs encontrados', { exact: true }),
  ).toBeVisible()
  await selectScenario(dialog, 'variable-latency')
  const completed = await page.evaluate(async () => {
    const completed: string[] = []
    await Promise.all(
      ['Emerald', 'Sage'].map(async (q) => {
        await fetch(`/api/nfts?q=${q}`)
        completed.push(q)
      }),
    )
    return completed
  })
  expect(completed).toEqual(['Sage', 'Emerald'])
})

test('serializa atualizações concorrentes e restaura todos os dados do cenário', async ({
  page,
  context,
}) => {
  const second = await context.newPage()
  await Promise.all([visit(page, '/'), visit(second, '/')])
  const pages = [page, second]
  const results = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      browserRequest(pages[index % 2], '/demo/events', {
        method: 'POST',
        body: { type: 'nft.updated' },
      }),
    ),
  )
  expect(results.map((result) => result.status)).toEqual(Array(6).fill(200))
  for (const tab of pages) {
    expect(
      (await browserRequest(tab, '/nfts/emerald-ape-042')).body,
    ).toMatchObject({ price: '1.25', version: 7 })
  }
  await browserRequest(page, '/demo/reset', {
    method: 'POST',
    body: { scenario: 'default' },
  })
  expect(
    (await browserRequest(second, '/nfts/emerald-ape-042')).body,
  ).toMatchObject({ price: '1.19', version: 1 })
  const persisted = await readMockStorage(page)
  expect(persisted.nfts).toHaveLength(36)
  expect(persisted.users).toHaveLength(2)
  expect(persisted.orders).toEqual([])
  expect(persisted.sessions).toEqual([])
  expect(persisted.wallets).toEqual([])
  expect(persisted.quotes).toEqual([])
  expect(persisted.idempotency).toEqual({})
  expect(persisted.favorites).toEqual({})
  expect(JSON.stringify(persisted)).not.toContain('Kurio@2026')
  await second.close()
})

test('migra os dados legados sem perder alterações nem manter duas fontes de estado', async ({
  page,
  browser,
  baseURL,
}) => {
  await visit(page, '/')
  await browserRequest(page, '/demo/events', {
    method: 'POST',
    body: { type: 'nft.updated' },
  })
  const persisted = await readMockStorage(page)
  const isolated = await browser.newContext({ baseURL })
  try {
    await isolated.addInitScript((database) => {
      if (location.protocol.startsWith('http'))
        localStorage.setItem('kurio-mock-database-v1', JSON.stringify(database))
    }, persisted)
    const migrated = await isolated.newPage()
    await visit(migrated, '/')
    expect(
      (await browserRequest(migrated, '/nfts/emerald-ape-042')).body,
    ).toMatchObject({ price: '1.2', version: 2 })
    expect(await readMockStorage(migrated)).toEqual(persisted)
    expect(
      await migrated.evaluate(() =>
        localStorage.getItem('kurio-mock-database-v1'),
      ),
    ).toBeNull()
  } finally {
    await isolated.close()
  }
})

test('recupera armazenamento corrompido e preserva o idioma escolhido', async ({
  page,
}) => {
  await visit(page, '/')
  await page.evaluate(() => {
    localStorage.setItem('kurio-language', 'en')
  })
  await corruptMockStorage(page)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Demonstration', exact: true }).click()
  await expect(page.getByText('36 NFTs found', { exact: true })).toBeVisible()
})

test('preserva precisão de wei e rejeita valores ETH ambíguos ou numéricos', () => {
  expect(weiToEth(ethToWei('0.1') + ethToWei('0.2'))).toBe('0.3')
  expect(weiToEth(ethToWei('999999999.000000000000000001'))).toBe(
    '999999999.000000000000000001',
  )
  for (const value of [
    0.1,
    -1,
    '-1',
    '1e-18',
    '01',
    '0.10',
    '0.0000000000000000001',
    '',
  ])
    expect(ethSchema.safeParse(value).success).toBe(false)
})
