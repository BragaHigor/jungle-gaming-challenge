import { seedWallets } from './helpers/account'
import { test, expect, type Page } from '@playwright/test'
import { visit } from './helpers/navigation'
import { signInFixture, submitLogin } from './helpers/auth'
import { cartRequest, seedCart } from './helpers/cart'
import { readMockStorage } from './helpers/storage'

async function demo(page: Page, scenario: string) {
  await page
    .getByRole('button', { name: 'Demonstração', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Controle da demonstração',
    exact: true,
  })
  await dialog
    .getByRole('combobox', { name: 'Cenário', exact: true })
    .selectOption(scenario)
  await dialog
    .getByRole('button', { name: 'Aplicar cenário', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
}
const summary = (page: Page) =>
  page.getByRole('region', { name: 'Resumo da carteira', exact: true })
const add = (page: Page, quantity = 1, editionId = '1/50') =>
  cartRequest(page, '/cart/items', 'POST', {
    nftId: 'emerald-ape-042',
    editionId,
    quantity,
  })

test('compra adiciona a edição selecionada, mantém após refresh e permite editar e remover', async ({
  page,
}) => {
  await visit(page, '/nfts/emerald-ape-042')
  await page.getByRole('button', { name: '1/10', exact: true }).click()
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .click()
  await page
    .getByRole('button', { name: /^Comprar(?: NFT)?$/i })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL('/cart')
  await expect(page.getByText('Edição 1/10', { exact: true })).toBeVisible()
  await expect(
    summary(page).getByText('2.396 ETH', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('status', { name: 'Quantidade', exact: true }),
  ).toHaveText('2')
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .click()
  await expect(
    summary(page).getByText('3.586 ETH', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: /Remover Emerald/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true }),
  ).toBeVisible()
  expect((await cartRequest(page)).body.items).toEqual([])
})

test('separa edições do mesmo NFT e rejeita excesso de estoque e versão obsoleta', async ({
  page,
}) => {
  await visit(page, '/')
  expect((await add(page, 1, '1/1')).status).toBe(200)
  expect((await add(page, 1, '1/1')).status).toBe(409)
  expect((await add(page, 3, '1/10')).status).toBe(200)
  const cart = (await cartRequest(page)).body
  expect(cart.items).toHaveLength(2)
  const id = cart.items[1].id
  expect(
    (
      await cartRequest(page, `/cart/items/${id}`, 'PATCH', {
        quantity: 2,
        cartVersion: cart.version,
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await cartRequest(page, `/cart/items/${id}`, 'DELETE', {
        cartVersion: cart.version,
      })
    ).body,
  ).toMatchObject({ error: { code: 'CART_CHANGED' } })
  await visit(page, '/cart')
  await expect(page.getByText('Edição 1/1', { exact: true })).toBeVisible()
  await expect(page.getByText('Edição 1/10', { exact: true })).toBeVisible()
  expect((await cartRequest(page)).body.items).toHaveLength(2)
})

test('aplica e remove cupom pela API e preserva cupom válido após tentativas inválidas', async ({
  page,
}) => {
  await visit(page, '/')
  await add(page, 2)
  await visit(page, '/cart')
  const input = page.getByRole('textbox', {
    name: 'Código promocional',
    exact: true,
  })
  const apply = page.getByRole('button', { name: 'Aplicar', exact: true })
  await expect(apply).toBeEnabled()
  await input.fill('KURIO10')
  await apply.click()
  await expect(
    summary(page).getByText('2.158 ETH', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Cupom KURIO10 aplicado', { exact: true }),
  ).toBeVisible()
  for (const [code, message] of [
    ['INVALIDO', 'Cupom inválido. Confira o código.'],
    ['EXPIRADO', 'Este cupom expirou. Remova-o para continuar.'],
  ]) {
    await input.fill(code)
    await apply.click()
    await expect(page.getByRole('alert')).toHaveText(message)
    expect((await cartRequest(page)).body.coupon).toBe('KURIO10')
  }
  await page.reload()
  await expect(
    page.getByText('Cupom KURIO10 aplicado', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Remover cupom', exact: true }).click()
  await expect(
    summary(page).getByText('2.396 ETH', { exact: true }),
  ).toBeVisible()
  expect((await cartRequest(page)).body.coupon).toBeNull()
})

test('combina visitante no login uma única vez e mantém carrinhos privados isolados', async ({
  page,
}) => {
  await visit(page, '/')
  await add(page, 2)
  await visit(page, '/login?redirect=%2Fcart')
  await submitLogin(page)
  await expect(page).toHaveURL('/cart')
  await expect(
    summary(page).getByText('2.396 ETH', { exact: true }),
  ).toBeVisible()
  expect(
    (await cartRequest(page, '/cart', 'GET', undefined, true)).body.items,
  ).toEqual([])
  await visit(page, '/login?redirect=%2Fcart')
  await submitLogin(page)
  await expect(page).toHaveURL('/cart')
  expect((await cartRequest(page)).body.items[0].quantity).toBe(2)
  await visit(page, '/profile')
  await page
    .getByRole('button', { name: 'Sair', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await visit(page, '/cart')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true }),
  ).toBeVisible()
  await visit(page, '/login?redirect=%2Fcart')
  await submitLogin(page, 'visitante@kurio.demo')
  await expect(page).toHaveURL('/cart')
  expect((await cartRequest(page)).body.items).toEqual([])
})

test('preserva o excesso do visitante ao combinar com estoque limitado sem duplicar no novo login', async ({
  page,
}) => {
  await visit(page, '/')
  await signInFixture(page)
  await add(page, 8, '1/10')
  await page.evaluate(() => sessionStorage.removeItem('kurio-session'))
  await add(page, 5, '1/10')
  await signInFixture(page)
  expect((await cartRequest(page)).body.items[0].quantity).toBe(10)
  expect(
    (await cartRequest(page, '/cart', 'GET', undefined, true)).body.items[0]
      .quantity,
  ).toBe(3)
  await signInFixture(page)
  expect((await cartRequest(page)).body.items[0].quantity).toBe(10)
  expect(
    (await cartRequest(page, '/cart', 'GET', undefined, true)).body.items[0]
      .quantity,
  ).toBe(3)
  await visit(page, '/cart')
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Parte dos itens do visitante' }),
  ).toBeVisible()
})

test('falha e recupera a cotação sem perder itens nem liberar pagamento com totais antigos', async ({
  page,
}) => {
  await visit(page, '/')
  await seedCart(page)
  await visit(page, '/cart')
  await expect(
    summary(page).getByText('26.846 ETH', { exact: true }),
  ).toBeVisible()
  await demo(page, 'quote-failure')
  await expect(summary(page).getByRole('alert')).toContainText(
    'Não foi possível calcular a cotação.',
  )
  await expect(
    page.getByRole('button', { name: 'Conectar e finalizar', exact: true }),
  ).toBeDisabled()
  expect((await cartRequest(page)).body.items).toHaveLength(3)
  await demo(page, 'cart-ready')
  await expect(
    page.getByRole('link', { name: 'Conectar e finalizar', exact: true }),
  ).toBeVisible()
})

test('recebe alteração pelo Socket.IO, recalcula e exige revisão da nova cotação', async ({
  page,
}) => {
  await visit(page, '/')
  await add(page, 2)
  await visit(page, '/cart')
  await expect(
    summary(page).getByText('2.396 ETH', { exact: true }),
  ).toBeVisible()
  await demo(page, 'cart-price-change')
  await expect(
    summary(page).getByText('2.416 ETH', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Conectar e finalizar', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Revisei os valores', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: 'Conectar e finalizar', exact: true }),
  ).toBeVisible()
  await demo(page, 'cart-stock-change')
  await expect(page.getByRole('alert')).toContainText(
    'O estoque de um item mudou.',
  )
  await expect(
    page.getByRole('button', { name: 'Conectar e finalizar', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: /Remover Emerald/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio', exact: true }),
  ).toBeVisible()
})

test('expira a cotação e só libera continuar após recalcular e revisar', async ({
  page,
}) => {
  await page.clock.install()
  await visit(page, '/')
  await add(page)
  await visit(page, '/cart')
  await expect(
    summary(page).getByText('1.206 ETH', { exact: true }),
  ).toBeVisible()
  await page.clock.fastForward(121000)
  await expect(
    page.getByText('A cotação expirou. Recalcule antes de continuar.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Conectar e finalizar', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Recalcular cotação', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Revisei os valores', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: 'Conectar e finalizar', exact: true }),
  ).toBeVisible()
  const database = await readMockStorage(page)
  expect(database.quotes).toHaveLength(1)
})

test('serializa inclusões concorrentes e consome o visitante uma vez em logins simultâneos', async ({
  page,
  context,
}) => {
  await visit(page, '/')
  const other = await context.newPage()
  await visit(other, '/')
  const additions = await Promise.all([
    add(page, 6, '1/10'),
    add(other, 6, '1/10'),
  ])
  expect(additions.map((result) => result.status).sort()).toEqual([200, 409])
  const login = (tab: Page) =>
    cartRequest(tab, '/auth/login', 'POST', {
      email: 'colecionador@kurio.demo',
      password: 'Kurio@2026',
    })
  const sessions = await Promise.all([login(page), login(other)])
  expect(sessions.map((result) => result.status)).toEqual([200, 200])
  await page.evaluate(
    (token) => sessionStorage.setItem('kurio-session', token),
    sessions[0].body.token,
  )
  expect((await cartRequest(page)).body.items[0].quantity).toBe(6)
  expect(
    (await cartRequest(page, '/cart', 'GET', undefined, true)).body.items,
  ).toEqual([])
})

test('não duplica inclusão quando o botão é acionado duas vezes imediatamente', async ({
  page,
}) => {
  await visit(page, '/nfts/emerald-ape-042')
  const requests: string[] = []
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().endsWith('/api/cart/items')
    )
      requests.push(request.url())
  })
  await page
    .getByRole('button', { name: /^COMPRAR(?: NFT)?$/ })
    .filter({ visible: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
    })
  await expect(page).toHaveURL('/cart')
  expect(requests).toHaveLength(1)
  expect((await cartRequest(page)).body.items[0].quantity).toBe(1)
})

test('calcula desconto em wei com 18 casas decimais e descarta cotação de versão antiga', async ({
  page,
}) => {
  await visit(page, '/')
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('kurio-mocks', 1)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('state', 'readwrite')
          const store = transaction.objectStore('state')
          const read = store.get('database')
          read.onsuccess = () => {
            const data = read.result
            data.nfts[0].price = '0.000000000000000019'
            data.nfts[0].version++
            store.put(data, 'database')
          }
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onabort = () => {
            database.close()
            reject(transaction.error)
          }
        }
        request.onerror = () => reject(request.error)
      }),
  )
  await add(page, 3)
  let cart = (await cartRequest(page)).body
  await cartRequest(page, '/cart/coupon', 'POST', {
    cartVersion: cart.version,
    code: 'KURIO10',
  })
  cart = (await cartRequest(page)).body
  const payload = {
    cartVersion: cart.version,
    resourceVersions: { 'emerald-ape-042': 2 },
    network: 'Ethereum',
  }
  const result = await cartRequest(page, '/cart/quote', 'POST', payload)
  expect(result.status).toBe(200)
  expect(result.body.totals).toEqual({
    subtotal: '0.000000000000000057',
    discount: '0.000000000000000005',
    fee: '0.016',
    total: '0.016000000000000052',
  })
  await cartRequest(page, `/cart/items/${cart.items[0].id}`, 'PATCH', {
    quantity: 2,
    cartVersion: cart.version,
  })
  expect(
    (await cartRequest(page, '/cart/quote', 'POST', payload)).body,
  ).toMatchObject({ error: { code: 'CART_CHANGED' } })
})

test('vincula a cotação privada à carteira do proprietário e à rede escolhida', async ({
  page,
}) => {
  await visit(page, '/')
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'pending-order' })
  await signInFixture(page)
  await add(page)
  const cart = (await cartRequest(page)).body
  const payload = {
    cartVersion: cart.version,
    walletId: 'wallet-a',
    network: 'Ethereum',
  }
  const quote = await cartRequest(page, '/quotes', 'POST', payload)
  expect(quote.status).toBe(200)
  expect(quote.body).toMatchObject({
    userId: 'collector-a',
    walletId: 'wallet-a',
    network: 'Ethereum',
    cartVersion: cart.version,
  })
  expect(
    (
      await cartRequest(page, '/quotes', 'POST', {
        ...payload,
        network: 'Polygon',
      })
    ).status,
  ).toBe(422)
  await signInFixture(page, 'visitante@kurio.demo')
  const other = (await cartRequest(page)).body
  expect(
    (
      await cartRequest(page, '/quotes', 'POST', {
        ...payload,
        cartVersion: other.version,
      })
    ).status,
  ).toBe(403)
})

test('bloqueia a confirmação já aberta se a cotação expirar durante a revisão', async ({
  page,
}) => {
  await page.clock.install()
  await visit(page, '/')
  await signInFixture(page)
  await add(page)
  await seedWallets(page)
  await visit(page, '/checkout')
  for (const [name, value] of [
    ['Nome de exibição', 'Alex Silva'],
    ['Nome de usuário', 'alexsilva'],
    ['Nome do perfil', 'Coleção do Alex'],
    ['E-mail', 'alex@kurio.demo'],
    ['Código de indicação', 'KURIO'],
    ['Nome ENS', 'alexsilva.eth'],
  ])
    await page.getByRole('textbox', { name, exact: true }).fill(value)
  await page
    .getByRole('button', { name: 'Revisar compra', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Revisão da compra',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await page.clock.fastForward(121000)
  await expect(
    dialog.getByRole('button', { name: 'Confirmar compra', exact: true }),
  ).toBeDisabled()
  await dialog
    .getByRole('link', { name: 'Voltar ao carrinho', exact: true })
    .click()
  await expect(page).toHaveURL('/cart')
  expect((await cartRequest(page)).body.items).toHaveLength(1)
})

test('mantém a altura do resumo durante a atualização da quantidade', async ({
  page,
}) => {
  await visit(page, '/')
  await add(page)
  await visit(page, '/cart')
  await expect(summary(page)).toHaveAttribute('aria-busy', 'false')
  await expect(
    summary(page).getByText('1.206 ETH', { exact: true }),
  ).toBeVisible()
  await page.evaluate(() => {
    const region = document.querySelector('aside [aria-busy]')!
    const related = document.querySelector(
      'main section[aria-label="Você também pode gostar"]',
    )
    const samples: { height: number; relatedTop: number }[] = []
    Object.assign(window, {
      summaryLayoutSamples: samples,
      sampleSummaryLayout: true,
    })
    function sample() {
      if (!Reflect.get(window, 'sampleSummaryLayout')) return
      samples.push({
        height: region.getBoundingClientRect().height,
        relatedTop:
          (related?.getBoundingClientRect().top ?? 0) + window.scrollY,
      })
      requestAnimationFrame(sample)
    }
    sample()
  })
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .click()
  await expect(summary(page)).toHaveAttribute('aria-busy', 'true')
  await expect(
    summary(page).getByText('2.396 ETH', { exact: true }),
  ).toBeVisible()
  await expect(summary(page)).toHaveAttribute('aria-busy', 'false')
  const samples = await page.evaluate(() => {
    Reflect.set(window, 'sampleSummaryLayout', false)
    return Reflect.get(window, 'summaryLayoutSamples') as {
      height: number
      relatedTop: number
    }[]
  })
  expect(samples.length).toBeGreaterThan(1)
  for (const key of ['height', 'relatedTop'] as const) {
    const values = samples.map((sample) => sample[key])
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(1)
  }
})

test('exibe uma única ação quando a cotação expira e o recálculo falha', async ({
  page,
}) => {
  await page.clock.install()
  await visit(page, '/')
  await add(page)
  await visit(page, '/cart')
  await expect(
    summary(page).getByText('1.206 ETH', { exact: true }),
  ).toBeVisible()
  await page.clock.fastForward(121000)
  const recalculate = summary(page).getByRole('button', {
    name: 'Recalcular cotação',
    exact: true,
  })
  await expect(recalculate).toHaveCount(1)
  const response = await cartRequest(page, '/demo/reset', 'POST', {
    scenario: 'quote-failure',
  })
  expect(response.status).toBe(200)
  await recalculate.click()
  await expect(summary(page).getByRole('alert')).toContainText(
    'Não foi possível calcular a cotação.',
  )
  await expect(summary(page).getByRole('alert')).toContainText(
    'A cotação expirou.',
  )
  await expect(recalculate).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Conectar e finalizar', exact: true }),
  ).toBeDisabled()
  expect((await cartRequest(page)).body.items).toHaveLength(1)
  await cartRequest(page, '/demo/reset', 'POST', { scenario: 'cart-ready' })
  await recalculate.click()
  await expect(recalculate).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Revisei os valores', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: 'Conectar e finalizar', exact: true }),
  ).toBeVisible()
})
