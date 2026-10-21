import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, getWallets, saveProfile, saveWallet } from '@/api/account'
import { readToken, sessionKey } from '@/services/session'
import type { ProfileUpdate, Session, WalletWrite } from '@/schemas/api/account'
import { useSession } from './useSession'

function useAccountWrite<Input, Output>(
  resource: string,
  write: (input: Input, signal: AbortSignal) => Promise<Output>,
  saved?: (data: Output) => void,
) {
  const { session } = useSession()
  const cache = useQueryClient()
  const token = session?.token
  const key = ['private', session?.user.id, token, resource]
  const active = useRef<AbortController | null>(null)
  const locked = useRef(false)
  useEffect(() => () => active.current?.abort(), [token])
  const mutation = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (input: Input) => {
      if (!token || readToken() !== token || active.current)
        throw new Error('Inactive account operation')
      const controller = new AbortController()
      active.current = controller
      try {
        return await write(input, controller.signal)
      } finally {
        if (active.current === controller) active.current = null
      }
    },
    onSettled: () => {
      locked.current = false
    },
    onSuccess: async (data) => {
      if (readToken() !== token) return
      await cache.cancelQueries({ queryKey: key })
      if (readToken() !== token) return
      cache.setQueryData(key, data)
      saved?.(data)
    },
  })
  return {
    ...mutation,
    mutate: (input: Input, options?: Parameters<typeof mutation.mutate>[1]) => {
      if (locked.current) return
      locked.current = true
      mutation.mutate(input, options)
    },
  }
}
export function useProfileData() {
  const { session } = useSession()
  const cache = useQueryClient()
  const query = useQuery({
    queryKey: ['private', session?.user.id, session?.token, 'profile'],
    queryFn: ({ signal }) => getProfile(session!.token, signal),
    enabled: Boolean(session),
    retry: false,
  })
  const mutation = useAccountWrite(
    'profile',
    (input: ProfileUpdate, signal) =>
      saveProfile(session!.token, input, signal),
    (profile) => {
      cache.setQueryData<Session | null>(sessionKey, (current) => {
        if (!current || current.token !== session?.token) return current
        const { id, username, email, displayName } = profile
        return { ...current, user: { id, username, email, displayName } }
      })
    },
  )
  return { query, mutation }
}
export function useWalletsData() {
  const { session } = useSession()
  const query = useQuery({
    queryKey: ['private', session?.user.id, session?.token, 'wallets'],
    queryFn: ({ signal }) => getWallets(session!.token, signal),
    enabled: Boolean(session),
    retry: false,
  })
  const mutation = useAccountWrite(
    'wallets',
    ({ body, id }: { body: WalletWrite; id?: string }, signal) =>
      saveWallet(session!.token, body, id, signal),
  )
  return { query, mutation }
}
