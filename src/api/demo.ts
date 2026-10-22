import { readToken } from '@/services/session'
import {
  demoStatusSchema,
  type Scenario,
  type DemoEventInput,
} from '@/schemas/demo'
import { orderSchema } from '@/schemas/api/purchase'
import { authorization, client, parseResponse } from './client'

export async function getDemoStatus(signal?: AbortSignal) {
  return parseResponse(
    demoStatusSchema,
    (
      await client.get<unknown>('/demo', {
        signal,
        headers: readToken() ? authorization(readToken()!) : {},
      })
    ).data,
  )
}
export async function resetDemo(scenario: Scenario) {
  return parseResponse(
    demoStatusSchema,
    (
      await client.post<unknown>(
        '/demo/reset',
        { scenario },
        { headers: readToken() ? authorization(readToken()!) : {} },
      )
    ).data,
  )
}
export async function emitDemoEvent(
  input: DemoEventInput | 'nft.updated' | 'order.updated',
) {
  await client.post(
    '/demo/events',
    typeof input === 'string' ? { type: input } : input,
    { headers: readToken() ? authorization(readToken()!) : {} },
  )
}
export async function getDemoOrder(
  id: string,
  token: string,
  signal?: AbortSignal,
) {
  return parseResponse(
    orderSchema,
    (
      await client.get<unknown>(`/orders/${encodeURIComponent(id)}`, {
        signal,
        headers: authorization(token),
      })
    ).data,
  )
}

export async function setDemoConnection(action: 'disconnect' | 'reconnect') {
  await client.post(
    '/demo/connection',
    { action },
    { headers: readToken() ? authorization(readToken()!) : {} },
  )
  return action
}
