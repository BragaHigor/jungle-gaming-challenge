import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCart, changeCart, getCartQuote, type CartAction } from '@/api/cart'
import { ApiError } from '@/api/client'
import { readToken } from '@/services/session'
import { useSession } from './useSession'

export function useCartController() {
  const { session } = useSession()
  const alive = useRef(true)
  const writing = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const [reviewedId, setReviewedId] = useState<string | null>(null)
  const token = session?.token ?? null
  const userId = session?.user.id
  const scope = useMemo(
    () => (token ? ['private', userId!, token, 'cart'] : ['cart', 'visitor']),
    [token, userId],
  )
  const key = [...scope, 'state']
  const cache = useQueryClient()
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getCart(token, signal),
    retry: false,
    staleTime: 0,
  })
  const mutation = useMutation({
    mutationFn: ({
      action,
      cartVersion,
    }: {
      action: CartAction
      cartVersion: number
    }) => changeCart(token, action, cartVersion),
    onMutate: async () => {
      await cache.cancelQueries({ queryKey: scope })
      return { token }
    },
    onSuccess: (data, _variables, context) => {
      if (!alive.current || readToken() !== context.token) return
      cache.setQueryData(key, data)
      void cache.invalidateQueries({ queryKey: [...scope, 'quote'] })
    },
    onSettled: () => {
      writing.current = false
    },
    onError: () => {
      if (alive.current && readToken() === token)
        void cache.invalidateQueries({ queryKey: key })
    },
  })
  const change = (action: CartAction, onSuccess?: () => void) => {
    if (writing.current) return
    writing.current = true
    mutation.mutate(
      { action, cartVersion: query.data?.version ?? 1 },
      {
        onSuccess: () => {
          if (alive.current && readToken() === token) onSuccess?.()
        },
      },
    )
  }
  return { query, mutation, change, scope, token, reviewedId, setReviewedId }
}
export const CartContext = createContext<ReturnType<
  typeof useCartController
> | null>(null)
export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('CartProvider is required')
  return value
}

export function useCartQuote(
  network: 'Ethereum' | 'Polygon' | 'Solana' = 'Ethereum',
) {
  const cart = useCart()
  const cache = useQueryClient()
  const data = cart.query.data
  const resourceVersions = Object.fromEntries(
    data?.lines.map((line) => [line.nftId, line.nft.version]) ?? [],
  )
  const query = useQuery({
    queryKey: [
      ...cart.scope,
      'quote',
      data?.version,
      resourceVersions,
      network,
    ],
    queryFn: ({ signal }) =>
      getCartQuote(
        cart.token,
        data!.version,
        resourceVersions,
        network,
        signal,
      ),
    enabled: Boolean(
      data?.lines.length && data.stockValid && !cart.mutation.isPending,
    ),
    retry: false,
    staleTime: 30000,
  })
  const [expiredId, setExpiredId] = useState<string | null>(null)
  const quote = query.data
  useEffect(() => {
    if (!quote) return
    const timer = setTimeout(
      () => setExpiredId(quote.id),
      Math.max(0, Date.parse(quote.expiresAt) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [quote])
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.code === 'CART_CHANGED')
      void cache.invalidateQueries({ queryKey: [...cart.scope, 'state'] })
  }, [cache, cart.scope, query.error])
  return { query, expired: Boolean(quote && expiredId === quote.id) }
}
