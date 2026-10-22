import { waitForAppReady } from './navigation'
import { expect, type Page } from '@playwright/test'

export async function cartRequest(
  page: Page,
  path = '/cart',
  method = 'GET',
  body?: unknown,
  anonymous = false,
) {
  await waitForAppReady(page)
  return page.evaluate(
    async ({ path, method, body, anonymous }) => {
      const token = anonymous ? null : sessionStorage.getItem('kurio-session')
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
    { path, method, body, anonymous },
  )
}

export async function seedCart(page: Page) {
  const cart = await cartRequest(page)
  if (cart.body.items.length) return
  const catalog = await cartRequest(page, '/nfts?pageSize=36')
  for (const [index, quantity] of [
    [0, 2],
    [4, 6],
    [5, 9],
  ]) {
    const result = await cartRequest(page, '/cart/items', 'POST', {
      nftId: catalog.body.items[index].id,
      editionId: '1/50',
      quantity,
    })
    expect(result.status).toBe(200)
  }
}
