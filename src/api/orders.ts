import { z } from 'zod'
import { authorization, client, parseResponse } from './client'
import {
  connectionRequestSchema,
  connectionSchema,
  orderRequestSchema,
  orderSchema,
} from '@/schemas/api/purchase'
export type OrderInput = z.infer<typeof orderRequestSchema>
export type ConnectionInput = z.infer<typeof connectionRequestSchema>
export async function connectWallet(token: string, input: ConnectionInput) {
  const { data } = await client.post('/wallet-connections', input, {
    headers: authorization(token),
  })
  return parseResponse(connectionSchema, data)
}
export async function disconnectWallet(token: string, id: string) {
  await client.delete(`/wallet-connections/${id}`, {
    headers: authorization(token),
  })
}
export async function createOrder(
  token: string,
  key: string,
  input: OrderInput,
) {
  const { data } = await client.post('/orders', input, {
    headers: { ...authorization(token), 'Idempotency-Key': key },
  })
  return parseResponse(orderSchema, data)
}
export async function getOrder(
  token: string,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await client.get(`/orders/${id}`, {
    headers: authorization(token),
    signal,
  })
  return parseResponse(orderSchema, data)
}
export async function getOrders(token: string, signal?: AbortSignal) {
  const { data } = await client.get('/orders', {
    headers: authorization(token),
    signal,
  })
  return parseResponse(z.array(orderSchema), data)
}
