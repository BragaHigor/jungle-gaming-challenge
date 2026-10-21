import { z } from 'zod'
import { authorization, client, parseResponse } from './client'
import {
  sessionSchema,
  favoritesSchema,
  walletsResponseSchema,
} from '@/schemas/api/account'
import type { RegistrationDraft } from '@/schemas/account'

export async function authenticate(
  mode: 'login' | 'register',
  draft: RegistrationDraft,
  signal?: AbortSignal,
) {
  const body =
    mode === 'login' ? { email: draft.email, password: draft.password } : draft
  const { data } = await client.post(`/auth/${mode}`, body, { signal })
  return parseResponse(sessionSchema, data)
}
export async function getSession(token: string, signal?: AbortSignal) {
  const { data } = await client.get('/session', {
    headers: authorization(token),
    signal,
  })
  return parseResponse(sessionSchema, data)
}
export async function logout(token: string) {
  await client.post('/auth/logout', {}, { headers: authorization(token) })
}
export async function getFavorites(token: string, signal?: AbortSignal) {
  const { data } = await client.get('/favorites', {
    headers: authorization(token),
    signal,
  })
  return parseResponse(favoritesSchema, data)
}
export async function setFavorite(
  token: string,
  nftId: string,
  favorite: boolean,
) {
  const { data } = await client.request({
    method: favorite ? 'POST' : 'DELETE',
    url: '/favorites',
    data: { nftId },
    headers: authorization(token),
  })
  return parseResponse(favoritesSchema, data)
}
export async function getWallets(token: string, signal?: AbortSignal) {
  const { data } = await client.get('/wallets', {
    headers: authorization(token),
    signal,
  })
  return parseResponse(walletsResponseSchema, data)
}
export type Favorites = z.infer<typeof favoritesSchema>
