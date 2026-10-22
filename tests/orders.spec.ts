import { fillCollector } from './helpers/purchase'
import { test, expect, type Page } from '@playwright/test'
import { visitWithAccount, signInFixture, submitLogin } from './helpers/auth'
import { seedWallets } from './helpers/account'
import { cartRequest } from './helpers/cart'
import { visit, waitForAppReady } from './helpers/navigation'

async function setup(page: Page, scenario = 'order-confirmed') {
  await visitWithAccount(page, '/checkout')
  expect(
    (await cartRequest(page, '/demo/reset', 'POST', { scenario })).status,
  ).toBe(200)
}
async function apiInput(page: Page) {
  const wallet = (await cartRequest(page, '/wallets')).body[0]
  const cart = (await cartRequest(page)).body
  const collector = { ...wallet.draft, username: 'alexsilva', note: '' }
  delete collector.walletNickname
  const connection = await cartRequest(page, '/wallet-connections', 'POST', {
    walletId: wallet.id,
    address: wallet.draft.address,
    network: wallet.draft.network,
    provider: wallet.draft.walletType,
  })
  expect(connection.status).toBe(200)
  const quote = await cartRequest(page, '/quotes', 'POST', {
    cartVersion: cart.version,
    walletId: wallet.id,
    network: wallet.draft.network,
  })
  expect(quote.status).toBe(200)
  return {
    quoteId: quote.body.id,
    walletId: wallet.id,
    connectionId: connection.body.id,
    collector,
  }
}
async function postOrder(page: Page, key: string, input: unknown) {
  await waitForAppReady(page)
  return page.evaluate(
    async ({ key, input }) => {
      const result = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('kurio-session')}`,
          'Idempotency-Key': key,
        },
        body: JSON.stringify(input),
      })
      return { status: result.status, body: await result.json() }
    },
    { key, input },
  )
}

test('compra pelo checkout e exibe recibo confirmado persistente sem alterar o snapshot', async ({
  page,
}) => {
  await setup(page)
  const review = await fillCollector(page)
  await expect(
    review.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await review
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(page).toHaveURL(/confirmation\?orderId=/)
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  const orders = (await cartRequest(page, '/orders')).body
  expect(orders).toHaveLength(1)
  expect((await cartRequest(page)).body.items).toEqual([])
  await cartRequest(page, '/demo/events', 'POST', { type: 'nft.updated' })
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  expect((await cartRequest(page, `/orders/${orders[0].id}`)).body).toEqual(
    orders[0],
  )
  await page
    .getByRole('button', { name: 'Ver referência simulada', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText(orders[0].reference)
})

test('simula recusa de conexão e permite conectar desconectar e conectar novamente', async ({
  page,
}) => {
  await setup(page, 'connection-refused')
  const review = await fillCollector(page)
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await expect(review.getByRole('alert')).toContainText(
    'A conexão foi recusada.',
  )
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'order-confirmed',
  })
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await expect(
    review.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeEnabled()
  await review
    .getByRole('button', { name: 'Desconectar carteira', exact: true })
    .click()
  await expect(
    review.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await expect(
    review.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeEnabled()
})

test('recusa pagamento preservando itens e estoque e permite nova tentativa explícita', async ({
  page,
}) => {
  await setup(page, 'order-declined')
  const before = (await cartRequest(page)).body.items
  const input = await apiInput(page)
  const result = await postOrder(page, crypto.randomUUID(), input)
  expect(result.status).toBe(200)
  await visit(page, `/confirmation?orderId=${result.body.id}`)
  await expect(
    page.getByRole('heading', { name: 'Seu pedido foi recusado', exact: true }),
  ).toBeVisible()
  expect((await cartRequest(page)).body.items).toEqual(before)
  const nft = (await cartRequest(page, `/nfts/${result.body.items[0].nft.id}`))
    .body
  expect(nft.editions[2].available).toBe(50)
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(page).toHaveURL(/checkout/)
})

test('cliques repetidos e chaves concorrentes não duplicam a compra e payload diferente conflita', async ({
  page,
}) => {
  await setup(page, 'order-pending')
  const input = await apiInput(page)
  const key = crypto.randomUUID()
  const [first, second] = await Promise.all([
    postOrder(page, key, input),
    postOrder(page, key, input),
  ])
  expect(first.status).toBe(200)
  expect(second.body.id).toBe(first.body.id)
  expect(
    (
      await postOrder(page, key, {
        ...input,
        collector: { ...input.collector, note: 'Outro conteúdo' },
      })
    ).status,
  ).toBe(409)
  expect((await postOrder(page, crypto.randomUUID(), input)).status).toBe(409)
  expect((await cartRequest(page, '/orders')).body).toHaveLength(1)
})

test('timeout após criação recupera o mesmo pedido após refresh', async ({
  page,
}) => {
  await setup(page, 'order-timeout')
  await cartRequest(page, '/demo/connection', 'POST', { action: 'disconnect' })
  const review = await fillCollector(page)
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await review
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Recuperar pedido', exact: true }),
  ).toBeEnabled({ timeout: 10000 })
  await page.reload()
  await page
    .getByRole('button', { name: 'Recuperar pedido', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  expect((await cartRequest(page, '/orders')).body).toHaveLength(1)
})

test('pedido pendente sobrevive ao refresh e confirmação remove somente quantidades compradas', async ({
  page,
}) => {
  await setup(page, 'order-pending')
  const input = await apiInput(page)
  const result = await postOrder(page, crypto.randomUUID(), input)
  const bought = result.body.items[0]
  expect(
    (
      await cartRequest(page, '/cart/items', 'POST', {
        nftId: bought.nft.id,
        editionId: bought.editionId,
        quantity: 1,
      })
    ).status,
  ).toBe(200)
  await visit(page, `/confirmation?orderId=${result.body.id}`)
  await expect(
    page.getByRole('heading', {
      name: 'Seu pedido está em processamento',
      exact: true,
    }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Seu pedido está em processamento',
      exact: true,
    }),
  ).toBeVisible()
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'order-confirmed',
  })
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  const remaining = (await cartRequest(page)).body.items
  expect(remaining).toHaveLength(1)
  expect(remaining[0].quantity).toBe(1)
  const saved = (await cartRequest(page, `/orders/${result.body.id}`)).body
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'order-declined' })
  expect((await cartRequest(page, `/orders/${result.body.id}`)).body).toEqual(
    saved,
  )
})

test('revalida preço e estoque antes de criar qualquer pedido', async ({
  page,
}) => {
  await setup(page)
  const input = await apiInput(page)
  await cartRequest(page, '/demo/events', 'POST', { type: 'nft.updated' })
  expect((await postOrder(page, crypto.randomUUID(), input)).status).toBe(409)
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  const fresh = await apiInput(page)
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'cart-stock-change',
  })
  expect((await postOrder(page, crypto.randomUUID(), fresh)).status).toBe(409)
  expect((await cartRequest(page, '/orders')).body).toEqual([])
})

test('pedidos de outro usuário são privados e o último pedido pode ser retomado sem ID', async ({
  page,
}) => {
  await setup(page, 'order-pending')
  const result = await postOrder(
    page,
    crypto.randomUUID(),
    await apiInput(page),
  )
  await signInFixture(page, 'visitante@kurio.demo')
  let delayedBootstrap = 0
  await page.route(/\/assets\/browser-[^/]+\.js$/, async (route) => {
    delayedBootstrap++
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  expect((await cartRequest(page, `/orders/${result.body.id}`)).status).toBe(
    403,
  )
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  expect(delayedBootstrap).toBeGreaterThan(0)
  await signInFixture(page)
  await visit(page, '/confirmation')
  await expect(
    page.getByRole('heading', {
      name: 'Seu pedido está em processamento',
      exact: true,
    }),
  ).toBeVisible()
})

test('cotação expirada e cupom expirado não criam pedido nem retiram itens', async ({
  page,
}) => {
  await setup(page)
  await page.clock.install()
  const input = await apiInput(page)
  await page.clock.fastForward(121000)
  expect((await postOrder(page, crypto.randomUUID(), input)).status).toBe(409)
  const cart = (await cartRequest(page)).body
  expect(
    (
      await cartRequest(page, '/cart/coupon', 'POST', {
        code: 'KURIO10',
        cartVersion: cart.version,
      })
    ).status,
  ).toBe(200)
  const withCoupon = await apiInput(page)
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'coupon-expired' })
  expect((await postOrder(page, crypto.randomUUID(), withCoupon)).status).toBe(
    422,
  )
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  expect((await cartRequest(page)).body.items).toEqual(cart.items)
})

test('compra completa navega do catálogo ao recibo após adicionar o NFT pela interface', async ({
  page,
}) => {
  await visitWithAccount(page, '/profile')
  await seedWallets(page)
  await visit(page, '/')
  await page
    .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
    .first()
    .click()
  await page
    .getByRole('button', { name: /^Comprar/i })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL(/cart/)
  await page
    .getByRole('link', { name: 'Conectar e finalizar', exact: true })
    .click()
  const review = await fillCollector(page)
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await review
    .getByRole('button', { name: 'Confirmar compra', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  expect((await cartRequest(page, '/orders')).body).toHaveLength(1)
})

test('alteração por Socket.IO durante revisão bloqueia confirmação com cotação anterior', async ({
  page,
}) => {
  await setup(page)
  const review = await fillCollector(page)
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  await expect(
    review.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeEnabled()
  await cartRequest(page, '/demo/events', 'POST', { type: 'nft.updated' })
  await expect(
    review.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  await expect(
    review.getByRole('link', { name: 'Voltar ao carrinho', exact: true }),
  ).toBeVisible()
})

test('sessão expirada durante pedido pendente retoma o mesmo pedido após autenticar', async ({
  page,
}) => {
  await setup(page, 'order-pending')
  const result = await postOrder(
    page,
    crypto.randomUUID(),
    await apiInput(page),
  )
  await visit(page, `/confirmation?orderId=${result.body.id}`)
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'session-expired',
  })
  await expect(
    page.getByRole('dialog', { name: 'Entrar', exact: true }),
  ).toBeVisible()
  await submitLogin(page)
  await expect(
    page.getByRole('heading', {
      name: 'Seu pedido está em processamento',
      exact: true,
    }),
  ).toBeVisible()
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'order-confirmed',
  })
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  const orders = (await cartRequest(page, '/orders')).body
  expect(orders).toHaveLength(1)
  expect(orders[0].id).toBe(result.body.id)
})

test('dois cliques imediatos em confirmar enviam uma única intenção de compra', async ({
  page,
}) => {
  await setup(page, 'order-pending')
  const review = await fillCollector(page)
  await review
    .getByRole('button', { name: 'Conectar carteira simulada', exact: true })
    .click()
  const confirm = review.getByRole('button', {
    name: 'Confirmar compra',
    exact: true,
  })
  await expect(confirm).toBeEnabled()
  const requests: string[] = []
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/orders'
    )
      requests.push(request.url())
  })
  await confirm.evaluate((button: HTMLButtonElement) => {
    button.click()
    button.click()
  })
  await expect(
    page.getByRole('heading', {
      name: 'Seu pedido está em processamento',
      exact: true,
    }),
  ).toBeVisible()
  expect(requests).toHaveLength(1)
  expect((await cartRequest(page, '/orders')).body).toHaveLength(1)
})

test('menu do checkout permanece aberto enquanto os dados lentos chegam', async ({
  page,
}) => {
  await setup(page)
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'cart-slow' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
  await expect(menu).toBeVisible()
  await expect(page.getByLabel(/^Nome de exibição/)).toBeAttached({
    timeout: 10000,
  })
  await expect(menu).toBeVisible()
  await menu
    .getByRole('combobox', { name: 'Idioma', exact: true })
    .selectOption('en')
  await expect(
    menu.getByRole('combobox', { name: 'Language', exact: true }),
  ).toHaveValue('en')
})

test('recupera falha de consulta do último pedido sem ID e sem reenviar a compra', async ({
  page,
}) => {
  await setup(page, 'order-pending')
  const result = await postOrder(
    page,
    crypto.randomUUID(),
    await apiInput(page),
  )
  await visit(page, '/confirmation')
  await expect(
    page.getByRole('heading', {
      name: 'Seu pedido está em processamento',
      exact: true,
    }),
  ).toBeVisible()
  await cartRequest(page, '/demo/connection', 'POST', { action: 'disconnect' })
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'order-read-failure',
  })
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível consultar este pedido.',
  )
  await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'order-confirmed',
  })
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  const orders = (await cartRequest(page, '/orders')).body
  expect(orders).toHaveLength(1)
  expect(orders[0].id).toBe(result.body.id)
})

test('API rejeita dados inválidos e conexão desfeita sem reservar estoque', async ({
  page,
}) => {
  await setup(page)
  const input = await apiInput(page)
  expect(
    (
      await postOrder(page, crypto.randomUUID(), {
        ...input,
        collector: { ...input.collector, email: 'inválido' },
      })
    ).status,
  ).toBe(422)
  expect(
    (
      await cartRequest(
        page,
        `/wallet-connections/${input.connectionId}`,
        'DELETE',
      )
    ).status,
  ).toBe(200)
  expect((await postOrder(page, crypto.randomUUID(), input)).status).toBe(403)
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  const nft = (await cartRequest(page, '/nfts/emerald-ape-042')).body
  expect(nft.editions[2].available).toBe(50)
})
