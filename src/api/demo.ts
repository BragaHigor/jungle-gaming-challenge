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

export async function startGuidedDemo(scenario: Scenario) {
  return parseResponse(
    demoStatusSchema,
    (await client.post<unknown>('/demo/start', { scenario })).data,
  )
}

export async function runGuidedAction(scenario: Scenario, signal: AbortSignal) {
  const token = readToken()
  const options = { signal, headers: token ? authorization(token) : {} }
  if (scenario.startsWith('coupon-')) {
    const { data } = await client.get('/cart', options)
    await client.post(
      '/cart/coupon',
      {
        code: scenario === 'coupon-expired' ? 'EXPIRADO' : 'DEMO-INVALID',
        cartVersion: data.version,
      },
      options,
    )
  }
  if (scenario === 'favorites-failure')
    await client.post('/favorites', { nftId: 'emerald-ape-042' }, options)
  if (
    scenario === 'account-write-failure' ||
    scenario === 'account-validation'
  ) {
    const { data } = await client.get('/profile', options)
    await client.patch(
      '/profile',
      {
        displayName: data.displayName,
        username: data.username,
        email: data.email,
        ens: data.ens,
        walletNickname: 'Demo',
        avatar: data.avatar,
        version: data.version,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
      options,
    )
  }
  if (scenario === 'connection-refused')
    await client.post(
      '/wallet-connections',
      {
        walletId: 'wallet-a',
        address: '0x1111111111111111111111111111111111111111',
        network: 'Ethereum',
        provider: 'MetaMask',
      },
      options,
    )
  if (scenario === 'malformed-event')
    await client.post('/demo/events', { type: 'nft.updated' }, options)
  return true
}
