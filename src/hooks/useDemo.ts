import { useNavigate } from '@tanstack/react-router'
import { useSession } from './useSession'
import { createContext, useContext, useState } from 'react'
import { z } from 'zod'
import { scenarioSchema } from '@/schemas/demo'
import { replaceSession } from '@/services/session'
import { demoDestination } from '@/constants/demo'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  startGuidedDemo,
  emitDemoEvent,
  getDemoOrder,
  getDemoStatus,
  resetDemo,
  setDemoConnection,
} from '@/api/demo'
import { useRealtime } from './useRealtime'

const guidedKey = 'kurio-guided-demo'
const guidedSchema = z.strictObject({
  scenario: scenarioSchema,
  generation: z.uuid(),
})
function readGuidedDemo() {
  try {
    const value = guidedSchema.safeParse(
      JSON.parse(sessionStorage.getItem(guidedKey) ?? 'null'),
    )
    return value.success ? value.data : null
  } catch {
    return null
  }
}

export function useDemoController() {
  const cache = useQueryClient()
  const navigate = useNavigate()
  const { session, endSession } = useSession()
  const [guided, setGuided] = useState(readGuidedDemo)
  const clearGuided = () => {
    sessionStorage.removeItem(guidedKey)
    setGuided(null)
  }
  const start = useMutation({
    mutationFn: async (scenario: z.infer<typeof scenarioSchema>) => {
      await cache.cancelQueries()
      const data = await startGuidedDemo(scenario)
      const active = { scenario, generation: data.generation }
      sessionStorage.setItem(guidedKey, JSON.stringify(active))
      setGuided(active)
      if (data.session) await replaceSession(data.session)
      else await endSession()
      void cache.resetQueries({ queryKey: ['nfts'] })
      cache.removeQueries({ queryKey: ['guided-action'] })
      await cache.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== 'nfts',
      })
      await navigate({ href: demoDestination(scenario), resetScroll: true })
      window.scrollTo(0, 0)
      document.getElementById('content')?.focus({ preventScroll: true })
      return demoDestination(scenario)
    },
  })
  const exit = useMutation({
    mutationFn: async () => {
      await cache.cancelQueries()
      await resetDemo('default')
      clearGuided()
      await endSession()
      void cache.resetQueries({ queryKey: ['nfts'] })
      cache.removeQueries({ queryKey: ['guided-action'] })
      await cache.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== 'nfts',
      })
      await navigate({ to: '/', resetScroll: true })
      window.scrollTo(0, 0)
      document.getElementById('content')?.focus({ preventScroll: true })
    },
  })
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
      if (data.scenario === 'default') clearGuided()
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
    guided: guided?.generation === generation ? guided : null,
    start,
    exit,
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
