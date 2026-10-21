import type { Socket } from 'socket.io-client'
import { resourceEventSchema, type ResourceEvent } from '@/schemas/api/events'

export function subscribeToEvents({
  generation,
  token,
  userId,
  onEvent,
  onConnection,
  onInvalid,
}: {
  generation: string
  token?: string
  userId?: string
  onEvent: (event: ResourceEvent) => void
  onConnection: (connected: boolean) => void
  onInvalid: () => void
}) {
  const versions = new Map<string, number>()
  const identities = new Set<string>()
  let connection: Socket | undefined
  let disposed = false
  const accept = (type: ResourceEvent['type'], payload: unknown) => {
    const result = resourceEventSchema.safeParse(payload)
    if (!result.success) {
      onInvalid()
      return
    }
    const event = result.data
    if (event.type !== type || event.generation !== generation) return
    if (event.type === 'order.updated' && event.userId !== userId) return
    const key = `${event.type}:${event.resourceId}`
    if (
      identities.has(event.eventId) ||
      event.version <= (versions.get(key) ?? 0)
    )
      return
    identities.add(event.eventId)
    if (identities.size > 256)
      identities.delete(identities.values().next().value!)
    versions.set(key, event.version)
    onEvent(event)
  }
  const connect = async () => {
    const { io } = await import('socket.io-client')
    if (disposed) return
    const socket = io(location.origin, {
      path: '/socket.io/',
      transports: ['websocket'],
      autoConnect: false,
      reconnectionAttempts: 3,
      reconnectionDelay: 300,
      query: { generation, session: token ?? '' },
    })
    connection = socket
    socket.on('nft.updated', (event: unknown) => accept('nft.updated', event))
    socket.on('order.updated', (event: unknown) =>
      accept('order.updated', event),
    )
    socket.on('connect', () => onConnection(true))
    socket.on('disconnect', () => onConnection(false))
    socket.on('connect_error', () => onConnection(false))
    socket.connect()
  }
  void connect().catch(() => {
    if (!disposed) onConnection(false)
  })
  return () => {
    disposed = true
    connection?.removeAllListeners()
    connection?.disconnect()
    versions.clear()
    identities.clear()
  }
}
