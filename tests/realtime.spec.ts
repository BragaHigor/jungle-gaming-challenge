import { test, expect, type Page, type Locator } from '@playwright/test'
import { visit } from './helpers/navigation'
import { cartRequest } from './helpers/cart'
import { seedPendingOrder } from './helpers/orders'
import { signInFixture } from './helpers/auth'

async function panel(page: Page) {
  await page.getByRole('button', { name: 'Demonstração', exact: true }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Controle da demonstração',
    exact: true,
  })
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('Sincronizando dados com a API…', { exact: true }),
  ).toHaveCount(0)
  return dialog
}
async function settle(
  page: Page,
  id: string,
  outcome: 'confirmed' | 'declined',
) {
  const response = await cartRequest(page, '/demo/events', 'POST', {
    type: 'order.updated',
    resourceId: id,
    outcome,
  })
  expect(response.status).toBe(200)
}
async function replay(page: Page, type: string, mode: string, id?: string) {
  expect(
    (
      await cartRequest(page, '/demo/events', 'POST', {
        type,
        mode,
        resourceId: id,
      })
    ).status,
  ).toBe(200)
}
async function ignored(dialog: Locator) {
  const text = await dialog
    .getByText(/eventos? desatualizados? ou repetidos? descartados?/)
    .allTextContents()
  return Number(text[0]?.match(/^\d+/)?.[0] ?? 0)
}

test('evento reconcilia o pedido pela API REST e atualiza o resultado na tela', async ({
  page,
}) => {
  const order = await seedPendingOrder(page)
  await visit(page, `/confirmation?orderId=${order.id}`)
  const dialog = await panel(page)
  const responses: number[] = []
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === `/api/orders/${order.id}`)
      responses.push(response.status())
  })
  await dialog
    .getByRole('button', { name: 'Confirmar pagamento simulado', exact: true })
    .click()
  await expect(
    dialog.getByText('Seus NFTs agora estão na sua carteira', { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  expect(responses).toContain(200)
  expect((await cartRequest(page)).body.items).toEqual([])
  expect((await cartRequest(page, '/orders')).body).toHaveLength(1)
})

test('evento de recusa mantém o carrinho e não fabrica comprovante', async ({
  page,
}) => {
  const order = await seedPendingOrder(page)
  await visit(page, `/confirmation?orderId=${order.id}`)
  const dialog = await panel(page)
  await dialog
    .getByRole('button', { name: 'Recusar pagamento simulado', exact: true })
    .click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', { name: 'Seu pedido foi recusado', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Ver referência simulada', exact: true }),
  ).toHaveCount(0)
  expect((await cartRequest(page)).body.items).toHaveLength(3)
})

test('descarta duplicatas eventos antigos inválidos e de outra geração no catálogo', async ({
  page,
}) => {
  await visit(page, '/')
  const dialog = await panel(page)
  await dialog
    .getByRole('button', { name: 'Alterar NFT de referência', exact: true })
    .click()
  await expect(page.locator('.catalog-grid article').first()).toContainText(
    '1.2 ETH',
  )
  await expect(
    dialog.getByText('Sincronizando dados com a API…', { exact: true }),
  ).toHaveCount(0)
  const before = (await cartRequest(page, '/nfts/emerald-ape-042')).body
  let count = await ignored(dialog)
  for (const mode of ['duplicate', 'stale', 'wrong-generation']) {
    await replay(page, 'nft.updated', mode)
    const increment = mode === 'duplicate' ? 2 : 1
    await expect.poll(() => ignored(dialog)).toBe(count + increment)
    count += increment
  }
  await replay(page, 'nft.updated', 'malformed')
  await expect(
    dialog.getByText('1 atualização inválida ignorada', { exact: true }),
  ).toBeVisible()
  expect((await cartRequest(page, '/nfts/emerald-ape-042')).body).toEqual(
    before,
  )
  await expect(page.locator('.catalog-grid article').first()).toContainText(
    '1.2 ETH',
  )
})

test('pedido terminal ignora repetição evento antigo e evento de outra conta', async ({
  page,
}) => {
  const order = await seedPendingOrder(page)
  await visit(page, `/confirmation?orderId=${order.id}`)
  const dialog = await panel(page)
  await settle(page, order.id, 'confirmed')
  await expect(
    dialog.getByText('Seus NFTs agora estão na sua carteira', { exact: true }),
  ).toBeVisible()
  const saved = (await cartRequest(page, `/orders/${order.id}`)).body
  let count = await ignored(dialog)
  for (const mode of ['duplicate', 'stale', 'foreign', 'wrong-generation']) {
    await replay(page, 'order.updated', mode, order.id)
    const increment = mode === 'duplicate' ? 2 : 1
    await expect.poll(() => ignored(dialog)).toBe(count + increment)
    count += increment
  }
  await settle(page, order.id, 'declined')
  expect((await cartRequest(page, `/orders/${order.id}`)).body).toEqual(saved)
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
})

test('reconexão busca preços perdidos na API e preserva filtros da URL', async ({
  page,
}) => {
  await visit(page, '/?q=Emerald')
  const dialog = await panel(page)
  await dialog
    .getByRole('button', { name: 'Interromper conexão', exact: true })
    .click()
  await expect(
    dialog.getByText('Tempo real desconectado', { exact: true }),
  ).toBeVisible()
  await cartRequest(page, '/demo/events', 'POST', { type: 'nft.updated' })
  await expect(page.locator('.catalog-grid article').first()).toContainText(
    '1.19 ETH',
  )
  await dialog.getByRole('button', { name: 'Reconectar', exact: true }).click()
  await expect(
    dialog.getByText('Tempo real conectado', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.catalog-grid article').first()).toContainText(
    '1.2 ETH',
  )
  await expect(page).toHaveURL(/q=Emerald/)
})

test('recupera pedido confirmado durante interrupção e refresh sem nova compra', async ({
  page,
}) => {
  const order = await seedPendingOrder(page)
  await visit(page, '/')
  const dialog = await panel(page)
  await dialog
    .getByRole('button', { name: 'Interromper conexão', exact: true })
    .click()
  await expect(
    dialog.getByText('Tempo real desconectado', { exact: true }),
  ).toBeVisible()
  await settle(page, order.id, 'confirmed')
  await dialog.getByRole('button', { name: 'Reconectar', exact: true }).click()
  await expect(
    dialog.getByText('Seus NFTs agora estão na sua carteira', { exact: true }),
  ).toBeVisible()
  await visit(page, `/confirmation?orderId=${order.id}`)
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible()
  const orders = (await cartRequest(page, '/orders')).body
  expect(orders).toHaveLength(1)
  expect(orders[0].id).toBe(order.id)
})

test('troca de usuário encerra a conexão anterior e não recebe pedido privado antigo', async ({
  page,
}) => {
  const order = await seedPendingOrder(page)
  await visit(page, '/')
  await panel(page)
  await page.keyboard.press('Escape')
  await signInFixture(page, 'visitante@kurio.demo')
  await page.reload()
  const dialog = await panel(page)
  await expect(
    dialog.getByRole('region', { name: 'Pedido', exact: true }),
  ).toHaveCount(0)
  expect((await cartRequest(page, `/orders/${order.id}`)).status).toBe(403)
  expect((await cartRequest(page, '/orders')).body).toEqual([])
  await expect(
    dialog.getByText('Seus NFTs agora estão na sua carteira', { exact: true }),
  ).toHaveCount(0)
})

test('controles de eventos e conexão permanecem traduzidos e acessíveis no mobile', async ({
  page,
}) => {
  await visit(page, '/')
  const dialog = await panel(page)
  await dialog
    .getByRole('combobox', { name: 'Modo do evento', exact: true })
    .selectOption('stale')
  await expect(
    dialog.getByRole('combobox', { name: 'Modo do evento', exact: true }),
  ).toHaveValue('stale')
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.scrollWidth <= element.clientWidth),
    )
    .toBe(true)
  await page.keyboard.press('Escape')
  await page.evaluate(() => localStorage.setItem('kurio-language', 'en'))
  await page.reload()
  await page.getByRole('button', { name: 'Demonstration', exact: true }).click()
  const english = page.getByRole('dialog', {
    name: 'Demonstration controls',
    exact: true,
  })
  await expect(
    english.getByRole('button', { name: 'Interrupt connection', exact: true }),
  ).toBeVisible()
  await expect(
    english.getByRole('combobox', { name: 'Event mode', exact: true }),
  ).toBeVisible()
})
