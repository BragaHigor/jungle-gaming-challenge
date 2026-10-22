import { useSession } from './useSession'
import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  emitDemoEvent,
  getDemoOrder,
  getDemoStatus,
  resetDemo,
  setDemoConnection,
} from '@/api/demo'
import { useRealtime } from './useRealtime'

export function useDemoController() {
  const cache = useQueryClient()
  const { session } = useSession()
  const status = useQuery({
    queryKey: ['private', session?.user.id, session?.token, 'demo-status'],
    queryFn: ({ signal }) => getDemoStatus(signal),
    staleTime: Infinity,
    retry: false,
  })
  const generation = status.data?.generation
  const token = session?.token
  const userId = session?.user.id
  const orderId = status.data?.pendingOrderId
  const order = useQuery({
    queryKey: ['demo', 'order', generation, userId, orderId],
    queryFn: ({ signal }) => getDemoOrder(orderId!, token!, signal),
    enabled: Boolean(orderId && token),
    retry: false,
  })
  const realtime = useRealtime(generation, token, userId)
  const reset = useMutation({
    mutationFn: resetDemo,
    onSuccess: async (data) => {
      await cache.cancelQueries({ queryKey: ['nfts'] })
      await cache.cancelQueries({
        predicate: (query) => query.queryKey.includes('cart'),
      })
      await cache.cancelQueries({ queryKey: ['demo', 'order'] })
      cache.removeQueries({ queryKey: ['demo', 'order'] })
      cache.setQueryData(
        ['private', session?.user.id, session?.token, 'demo-status'],
        data,
      )
      void cache.resetQueries({ queryKey: ['nfts'] })
      void cache.invalidateQueries({
        predicate: (query) => query.queryKey.includes('cart'),
      })
      void cache.invalidateQueries({ queryKey: ['session'] })
      void cache.invalidateQueries({ queryKey: ['private'] })
    },
  })
  const emit = useMutation({ mutationFn: emitDemoEvent })
  const connection = useMutation({
    mutationFn: setDemoConnection,
    onSuccess: (action) => {
      if (action === 'reconnect') realtime.reconnect()
    },
  })
  return {
    status,
    order,
    reset,
    emit,
    connection,
    ...realtime,
  }
}

export const DemoContext = createContext<ReturnType<
  typeof useDemoController
> | null>(null)
export function useDemo() {
  const demo = useContext(DemoContext)
  if (!demo) throw new Error('DemoProvider is required')
  return demo
}

export function useRealtimeStatus() {
  const demo = useContext(DemoContext)
  return {
    connected: demo?.connected ?? false,
    connectionKnown: demo?.connectionKnown ?? false,
    synchronizing: demo?.synchronizing ?? false,
  }
}
