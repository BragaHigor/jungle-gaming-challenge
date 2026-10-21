import { createContext, useContext, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  emitDemoEvent,
  getDemoOrder,
  getDemoStatus,
  resetDemo,
} from '@/api/demo'
import { subscribeToEvents } from '@/services/realtime'
import type { ResourceEvent } from '@/schemas/api/events'

export function useDemoController() {
  const cache = useQueryClient()
  const status = useQuery({
    queryKey: ['demo', 'status'],
    queryFn: ({ signal }) => getDemoStatus(signal),
    staleTime: Infinity,
    retry: false,
  })
  const generation = status.data?.generation
  const token = status.data?.session?.token
  const userId = status.data?.session?.user.id
  const orderId = status.data?.pendingOrderId
  const order = useQuery({
    queryKey: ['demo', 'order', generation, userId, orderId],
    queryFn: ({ signal }) => getDemoOrder(orderId!, token!, signal),
    enabled: Boolean(orderId && token),
    retry: false,
  })
  const [connection, setConnection] = useState<{
    generation: string
    online: boolean
  } | null>(null)
  const [lastEvent, setLastEvent] = useState<{
    generation: string
    type: ResourceEvent['type']
  } | null>(null)
  const [invalid, setInvalid] = useState<{
    generation: string
    count: number
  } | null>(null)
  useEffect(() => {
    if (!generation) return
    return subscribeToEvents({
      generation,
      token,
      userId,
      onConnection: (online) => {
        setConnection({ generation, online })
        if (online) {
          void cache.invalidateQueries({ queryKey: ['nfts'] })
          void cache.invalidateQueries({
            queryKey: ['demo', 'order', generation, userId],
          })
        }
      },
      onEvent: (event) => {
        setLastEvent({ generation, type: event.type })
        if (event.type === 'nft.updated')
          void cache.invalidateQueries({ queryKey: ['nfts'] })
        else
          void cache.invalidateQueries({
            queryKey: ['demo', 'order', generation],
          })
      },
      onInvalid: () =>
        setInvalid((current) => ({
          generation,
          count: current?.generation === generation ? current.count + 1 : 1,
        })),
    })
  }, [cache, generation, token, userId])
  const reset = useMutation({
    mutationFn: resetDemo,
    onSuccess: async (data) => {
      await cache.cancelQueries({ queryKey: ['nfts'] })
      await cache.cancelQueries({ queryKey: ['demo', 'order'] })
      cache.removeQueries({ queryKey: ['demo', 'order'] })
      cache.setQueryData(['demo', 'status'], data)
      void cache.resetQueries({ queryKey: ['nfts'] })
    },
  })
  const emit = useMutation({ mutationFn: emitDemoEvent })
  return {
    status,
    order,
    reset,
    emit,
    connected: Boolean(
      connection && connection.generation === generation && connection.online,
    ),
    lastEvent:
      lastEvent && lastEvent.generation === generation ? lastEvent.type : null,
    invalidEvents:
      invalid && invalid.generation === generation ? invalid.count : 0,
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
