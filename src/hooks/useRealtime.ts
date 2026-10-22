import { useEffect, useRef, useState } from 'react'
import { useQueryClient, type Query } from '@tanstack/react-query'
import { subscribeToEvents } from '@/services/realtime'
import { readToken } from '@/services/session'
import type { ResourceEvent } from '@/schemas/api/events'
import type { Order } from '@/schemas/api/purchase'
import type { Nft } from '@/schemas/api/catalog'

type State = {
  scope: string
  online: boolean
  syncing: boolean
  lastEvent: ResourceEvent['type'] | null
  invalid: number
  ignored: number
}
export function useRealtime(
  generation?: string,
  token?: string,
  userId?: string,
) {
  const cache = useQueryClient()
  const scope = `${generation}:${token ?? 'visitor'}`
  const [state, setState] = useState<State | null>(null)
  const controller = useRef<ReturnType<typeof subscribeToEvents> | null>(null)
  useEffect(() => {
    if (!generation) return
    let disposed = false
    let running = false
    let rerun = false
    let includeAccount = false
    const active = () => !disposed && (readToken() ?? undefined) === token
    const base: State = {
      scope,
      online: false,
      syncing: false,
      lastEvent: null,
      invalid: 0,
      ignored: 0,
    }
    const update = (patch: Partial<State>) => {
      if (active())
        setState((current) => ({
          ...(current?.scope === scope ? current : base),
          ...patch,
        }))
    }
    const belongs = (query: Query) => {
      const key = query.queryKey
      if (key[0] === 'nfts') return true
      if (!token && key[0] === 'cart' && key[1] === 'visitor') return true
      if (key[0] === 'demo' && key[1] === 'order')
        return key[2] === generation && key[3] === userId
      return (
        key[0] === 'private' &&
        key[1] === userId &&
        key[2] === token &&
        ['cart', 'orders', 'profile', 'wallets', 'favorites'].includes(
          String(key[3]),
        )
      )
    }
    const reconcile = async (all = false) => {
      includeAccount ||= all
      if (!active()) return
      if (running) {
        rerun = true
        return
      }
      running = true
      update({ syncing: true })
      try {
        do {
          rerun = false
          const full = includeAccount
          includeAccount = false
          const matches = (query: Query) =>
            belongs(query) &&
            (full ||
              query.queryKey[0] === 'nfts' ||
              query.queryKey[0] === 'demo' ||
              query.queryKey.includes('cart') ||
              query.queryKey.includes('orders'))
          await cache.cancelQueries({ predicate: matches })
          if (!active()) return
          await cache.invalidateQueries({
            predicate: matches,
            refetchType: 'active',
          })
        } while (rerun && active())
      } finally {
        running = false
        update({ syncing: false })
      }
    }
    const currentResource = (event: ResourceEvent) => {
      let version = 0
      let status: string | undefined
      const queries = cache.getQueryCache().findAll({ predicate: belongs })
      const records = queries.flatMap((query) => {
        const data = query.state.data as
          Nft | { items: Nft[] } | Order | Order[] | undefined
        if (!data) return []
        if (Array.isArray(data)) return data
        if ('items' in data && query.queryKey[0] === 'nfts')
          return data.items as Nft[]
        const resource =
          query.queryKey[0] === 'nfts' ||
          query.queryKey.includes('orders') ||
          query.queryKey[0] === 'demo'
        return 'id' in data && resource ? [data as Nft | Order] : []
      })
      for (const record of records.filter(
        (value) => value.id === event.resourceId,
      )) {
        if (record.version < version) continue
        version = record.version
        status = 'status' in record ? record.status : undefined
      }
      return { version, status }
    }
    const subscription = subscribeToEvents({
      generation,
      token,
      userId,
      currentResource,
      onConnection: (online) => {
        update({ online })
        if (online) void reconcile(true)
      },
      onEvent: (event) => {
        update({ lastEvent: event.type })
        void reconcile()
      },
      onIgnored: () => {
        if (active())
          setState((current) => {
            const previous = current?.scope === scope ? current : base
            return { ...previous, ignored: previous.ignored + 1 }
          })
      },
      onInvalid: () => {
        if (active())
          setState((current) => {
            const previous = current?.scope === scope ? current : base
            return { ...previous, invalid: previous.invalid + 1 }
          })
      },
    })
    controller.current = subscription
    return () => {
      disposed = true
      subscription.dispose()
      if (controller.current === subscription) controller.current = null
    }
  }, [cache, generation, token, userId, scope])
  const current = state?.scope === scope ? state : null
  return {
    connected: current?.online ?? false,
    connectionKnown: current !== null,
    synchronizing: current?.syncing ?? false,
    lastEvent: current?.lastEvent ?? null,
    invalidEvents: current?.invalid ?? 0,
    ignoredEvents: current?.ignored ?? 0,
    reconnect: () => controller.current?.reconnect(),
  }
}
