import { readOrderAttempt, saveOrderAttempt } from '@/services/order-attempt'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrder, getOrders } from '@/api/orders'
import { useSession } from './useSession'
export function useOrder(id?: string) {
  const { session } = useSession()
  const cache = useQueryClient()
  const token = session?.token
  const userId = session?.user.id
  const orders = useQuery({
    queryKey: ['private', userId, token, 'orders', 'list'],
    queryFn: ({ signal }) => getOrders(token!, signal),
    enabled: Boolean(token && !id),
    retry: false,
    gcTime: 0,
  })
  const orderId = id ?? orders.data?.at(-1)?.id
  const query = useQuery({
    queryKey: ['private', userId, token, 'orders', 'detail', orderId],
    queryFn: ({ signal }) => getOrder(token!, orderId!, signal),
    enabled: Boolean(token && orderId),
    retry: false,
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 800 : false,
    refetchOnReconnect: 'always',
  })
  const currentOrder = query.data
  useEffect(() => {
    if (!currentOrder || !userId) return
    const attempt = readOrderAttempt(userId)
    if (attempt?.input.quoteId === currentOrder.quoteId)
      saveOrderAttempt(userId, null)
  }, [currentOrder, userId])
  const status = query.data?.status
  useEffect(() => {
    if (status === 'confirmed' || status === 'declined') {
      void cache.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes('cart') || query.queryKey[0] === 'nfts',
      })
    }
  }, [cache, status])
  return { query, orders, orderId }
}
