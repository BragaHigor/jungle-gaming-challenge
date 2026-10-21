import { queryOptions } from '@tanstack/react-query'
import { getSession } from '@/api/account'
import { ApiError } from '@/api/client'
import { queryClient } from '@/app/query-client'
import type { Session } from '@/schemas/api/account'

const storageKey = 'kurio-session'
export const sessionKey = ['session'] as const
export const readToken = () => sessionStorage.getItem(storageKey)
export const sessionOptions = () =>
  queryOptions({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      const token = readToken()
      if (!token) return null
      try {
        return await getSession(token, signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          if (readToken() === token) sessionStorage.removeItem(storageKey)
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: 0,
  })

let transition = 0
export async function replaceSession(session: Session | null) {
  const current = ++transition
  await Promise.all([
    queryClient.cancelQueries({ queryKey: sessionKey }),
    queryClient.cancelQueries({ queryKey: ['private'] }),
    queryClient.cancelQueries({ queryKey: ['cart'] }),
    queryClient.cancelQueries({ queryKey: ['demo', 'order'] }),
  ])
  if (current !== transition) return false
  queryClient.removeQueries({ queryKey: ['private'] })
  queryClient.removeQueries({ queryKey: ['cart'] })
  queryClient.removeQueries({ queryKey: ['demo', 'order'] })
  if (session) sessionStorage.setItem(storageKey, session.token)
  else sessionStorage.removeItem(storageKey)
  queryClient.setQueryData(sessionKey, session)
  return true
}

export function safeReturn(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)
  )
    return '/'
  try {
    const url = new URL(value, window.location.origin)
    const allowed =
      /^\/(?:nfts\/[a-zA-Z0-9._-]+|cart|checkout|confirmation|profile|wallets)?$/
    if (url.origin !== window.location.origin || !allowed.test(url.pathname))
      return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}
export const privatePage = (pathname: string) =>
  ['/profile', '/wallets', '/checkout', '/confirmation'].includes(pathname)
