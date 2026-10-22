import { expect, type Page } from '@playwright/test'
import { visitWithAccount } from './auth'
import { cartRequest } from './cart'
export async function seedPendingOrder(page: Page, scenario = 'order-pending') {
  await visitWithAccount(page, '/checkout')
  await cartRequest(page, '/demo/reset', 'POST', { scenario })
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
  const input = {
    quoteId: quote.body.id,
    walletId: wallet.id,
    connectionId: connection.body.id,
    collector,
  }
  const order = await page.evaluate(async (input) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('kurio-session')}`,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(`Pedido recusado: ${response.status}`)
    return response.json()
  }, input)
  return order
}
