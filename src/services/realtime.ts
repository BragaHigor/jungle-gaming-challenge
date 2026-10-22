import { readToken } from './session'
import type { Socket } from 'socket.io-client'
import { resourceEventSchema, type ResourceEvent } from '@/schemas/api/events'

export function subscribeToEvents({
  generation,
  token,
  userId,
  onEvent,
  onConnection,
  onInvalid,
  onIgnored,
  currentResource,
}: {
  generation: string
  token?: string
  userId?: string
  onEvent: (event: ResourceEvent) => void
  onConnection: (connected: boolean) => void
  onIgnored: () => void
  onInvalid: () => void
  currentResource: (event: ResourceEvent) => {
    version: number
    status?: string
  }
}) {
  const versions = new Map<string, number>()
  const identities = new Set<string>()
  let connection: Socket | undefined
  let disposed = false
  const active = () => !disposed && (readToken() ?? undefined) === token
  const accept = (type: ResourceEvent['type'], payload: unknown) => {
    if (!active()) return
    const result = resourceEventSchema.safeParse(payload)
    if (!result.success) {
      onInvalid()
      return
    }
    const event = result.data
    if (event.type !== type || event.generation !== generation) {
      onIgnored()
      return
    }
    if (event.type === 'order.updated' && event.userId !== userId) {
      onIgnored()
      return
    }
    const key = `${event.type}:${event.resourceId}`
    const current = currentResource(event)
    if (
      event.type === 'order.updated' &&
      current.status &&
      current.status !== 'pending' &&
      event.data.status !== current.status
    ) {
      onIgnored()
      return
    }
    if (
      identities.has(event.eventId) ||
      event.version <= (versions.get(key) ?? 0) ||
      event.version < current.version
    ) {
      onIgnored()
      return
    }
    identities.add(event.eventId)
    if (identities.size > 256)
      identities.delete(identities.values().next().value!)
    versions.set(key, event.version)
    onEvent(event)
  }
  const connect = async () => {
    const { io } = await import('socket.io-client')
    if (!active()) return
    const socket = io(location.origin, {
      path: '/socket.io/',
      transports: ['websocket'],
      autoConnect: false,
      reconnectionAttempts: 3,
      reconnectionDelay: 300,
      reconnectionDelayMax: 600,
      randomizationFactor: 0,
      query: { generation, session: token ?? '' },
    })
    connection = socket
    socket.on('nft.updated', (event: unknown) => accept('nft.updated', event))
    socket.on('order.updated', (event: unknown) =>
      accept('order.updated', event),
    )
    socket.on('connect', () => {
      if (active()) onConnection(true)
    })
    socket.on('disconnect', () => {
      if (active()) onConnection(false)
    })
    socket.on('connect_error', () => {
      if (active()) onConnection(false)
    })
    socket.connect()
  }
  void connect().catch(() => {
    if (active()) onConnection(false)
  })
  return {
    reconnect: () => {
      if (active()) connection?.connect()
    },
    dispose: () => {
      disposed = true
      connection?.removeAllListeners()
      connection?.disconnect()
      versions.clear()
      identities.clear()
    },
  }
}
