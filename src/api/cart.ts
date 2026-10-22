import { authorization, client, parseResponse } from './client'
import {
  cartResponseSchema,
  quoteSchema,
  type CartItemRequest,
} from '@/schemas/api/purchase'

const headers = (token: string | null) => (token ? authorization(token) : {})
export async function getCart(token: string | null, signal?: AbortSignal) {
  const { data } = await client.get('/cart', {
    headers: headers(token),
    signal,
  })
  return parseResponse(cartResponseSchema, data)
}
export type CartAction =
  | { type: 'add'; item: CartItemRequest }
  | { type: 'quantity'; id: string; quantity: number }
  | { type: 'remove'; id: string }
  | { type: 'coupon'; code: string }
  | { type: 'removeCoupon' }

export async function changeCart(
  token: string | null,
  action: CartAction,
  cartVersion: number,
) {
  const options = { headers: headers(token) }
  let data: unknown
  if (action.type === 'add')
    ({ data } = await client.post('/cart/items', action.item, options))
  if (action.type === 'quantity')
    ({ data } = await client.patch(
      `/cart/items/${encodeURIComponent(action.id)}`,
      { quantity: action.quantity, cartVersion },
      options,
    ))
  if (action.type === 'remove')
    ({ data } = await client.delete(
      `/cart/items/${encodeURIComponent(action.id)}`,
      { ...options, data: { cartVersion } },
    ))
  if (action.type === 'coupon')
    ({ data } = await client.post(
      '/cart/coupon',
      { code: action.code, cartVersion },
      options,
    ))
  if (action.type === 'removeCoupon')
    ({ data } = await client.delete('/cart/coupon', {
      ...options,
      data: { cartVersion },
    }))
  return parseResponse(cartResponseSchema, data)
}
export async function getCartQuote(
  token: string | null,
  cartVersion: number,
  resourceVersions: Record<string, number>,
  network: 'Ethereum' | 'Polygon' | 'Solana',
  signal?: AbortSignal,
) {
  const { data } = await client.post(
    '/cart/quote',
    { cartVersion, resourceVersions, network },
    { headers: headers(token), signal },
  )
  return parseResponse(quoteSchema, data)
}
