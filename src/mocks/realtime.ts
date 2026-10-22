import { settleOrder } from './order-state'
import type { Order } from '@/schemas/api/purchase'
import type { DemoEventInput } from '@/schemas/demo'
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { resourceEventSchema, type ResourceEvent } from '@/schemas/api/events'
import { ethToWei, weiToEth } from '@/utils/eth'
import { getSession, readDatabase, updateDatabase } from './database'
import { requireUser } from './auth'
import { MockError } from './responses'

const socketUrl = new URL('/', location.href)
socketUrl.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
const link = ws.link(socketUrl.href)
type Client = {
  bridge: ReturnType<typeof toSocketIo>
  generation: string
  userId?: string
  token: string | null
  heartbeat: number
}
const clients = new Map<string, Client>()
const blocked = new Set<string>()
const history = new Map<string, ResourceEvent[]>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
export const realtimeHandler = link.addEventListener(
  'connection',
  async (connection) => {
    const database = await readDatabase()
    const token = connection.client.url.searchParams.get('session') || null
    const session = getSession(database, token)
    if (blocked.has(token ?? 'visitor')) {
      connection.client.close(4000, 'Simulated interruption')
      return
    }
    const generation = connection.client.url.searchParams.get('generation')
    if (generation !== database.generation || (token && !session)) {
      connection.client.close(4001, 'Invalid session')
      return
    }
    const bridge = toSocketIo(connection)
    const heartbeat = window.setInterval(
      () => connection.client.send('2'),
      20000,
    )
    clients.set(connection.client.id, {
      bridge,
      generation,
      userId: session?.user.id,
      token,
      heartbeat,
    })
    connection.client.addEventListener('close', () => {
      window.clearInterval(heartbeat)
      clients.delete(connection.client.id)
    })
  },
)
export function closeConnections() {
  for (const client of clients.values()) {
    window.clearInterval(client.heartbeat)
    client.bridge.rawClient.close(1000, 'Scenario reset')
  }
  clients.clear()
  blocked.clear()
  history.clear()
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}
export async function broadcastResource(event: ResourceEvent) {
  const database = await readDatabase()
  const key = `${event.generation}:${event.type}:${event.resourceId}`
  const previous = history.get(key) ?? []
  if (!previous.some((value) => value.version === event.version))
    history.set(key, [...previous, structuredClone(event)].slice(-2))
  for (const client of clients.values()) {
    if (client.generation !== event.generation) continue
    if (client.token && !getSession(database, client.token)) {
      client.bridge.rawClient.close(4001, 'Invalid session')
      continue
    }
    if (event.type === 'order.updated' && client.userId !== event.userId)
      continue
    client.bridge.client.emit(event.type, event)
  }
}
export async function emitResourceEvent(
  type: 'nft.updated' | 'order.updated',
  request?: Request,
  change?: { nftId: string; editionId: string; soldOut: boolean },
  options?: DemoEventInput,
) {
  const initial = await readDatabase()
  if (options?.mode && options.mode !== 'normal') {
    await replayEvent(type, request!, options)
    return
  }
  if (initial.scenario === 'malformed-event') {
    for (const client of clients.values())
      client.bridge.client.emit(type, { type, version: -1, data: null })
    return
  }
  const event = await updateDatabase((database) => {
    if (database.generation !== initial.generation)
      throw new MockError('SCENARIO_RESET', 409)
    const envelope = {
      eventId: crypto.randomUUID(),
      generation: database.generation,
    }
    if (type === 'nft.updated') {
      const nft = change
        ? database.nfts.find((value) => value.id === change.nftId)
        : database.nfts[0]
      if (!nft) throw new MockError('NOT_FOUND', 404)
      nft.price = weiToEth(ethToWei(nft.price) + ethToWei('0.01'))
      const edition = change
        ? nft.editions.find((value) => value.id === change.editionId)
        : nft.editions[2]
      if (!edition) throw new MockError('NOT_FOUND', 404)
      edition.available = change?.soldOut
        ? 0
        : Math.max(0, edition.available - 1)
      nft.version += 1
      return resourceEventSchema.parse({
        ...envelope,
        type,
        resourceId: nft.id,
        version: nft.version,
        data: nft,
      })
    }
    if (!request) throw new MockError('UNAUTHORIZED', 401)
    const session = requireUser(database, request)
    const order = database.orders.find(
      (value) =>
        value.userId === session.user.id &&
        (options?.resourceId
          ? value.id === options.resourceId
          : value.status === 'pending'),
    )
    if (!order) throw new MockError('NOT_FOUND', 404)
    if (options?.outcome) {
      if (order.status !== 'pending')
        return resourceEventSchema.parse({
          ...envelope,
          type,
          resourceId: order.id,
          userId: order.userId,
          version: order.version,
          data: order,
        })
      const job = database.settlements[order.id]
      if (!job) throw new MockError('CONFLICT', 409)
      job.outcome = options.outcome
      job.dueAt = 0
      settleOrder(database, order)
    } else order.version += 1
    order.updatedAt = new Date().toISOString()
    return resourceEventSchema.parse({
      ...envelope,
      type,
      resourceId: order.id,
      userId: order.userId,
      version: order.version,
      data: order,
    })
  })
  await broadcastResource(event)
  if (event.type === 'order.updated') await publishOrderStock(event.data)
}

export async function changeConnection(
  request: Request,
  action: 'disconnect' | 'reconnect',
) {
  const database = await readDatabase()
  const token =
    request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
  if (token) requireUser(database, request)
  const key = token ?? 'visitor'
  if (action === 'reconnect') {
    blocked.delete(key)
    return
  }
  blocked.add(key)
  for (const client of clients.values())
    if (client.token === token)
      client.bridge.rawClient.close(1000, 'Simulated interruption')
}

async function publishOrderStock(order: Order) {
  const database = await readDatabase()
  for (const id of new Set(order.items.map((item) => item.nft.id))) {
    const nft = database.nfts.find((value) => value.id === id)!
    const snapshot = order.items.find((item) => item.nft.id === id)!.nft
    const previous =
      history.get(`${database.generation}:nft.updated:${id}`) ?? []
    if (
      nft.version <= snapshot.version ||
      previous.some((event) => event.version === nft.version)
    )
      continue
    await broadcastResource({
      eventId: crypto.randomUUID(),
      generation: database.generation,
      type: 'nft.updated',
      resourceId: nft.id,
      version: nft.version,
      data: nft,
    })
  }
}
export async function publishOrder(order: Order) {
  const database = await readDatabase()
  await broadcastResource({
    eventId: crypto.randomUUID(),
    generation: database.generation,
    type: 'order.updated',
    resourceId: order.id,
    userId: order.userId,
    version: order.version,
    data: order,
  })
  await publishOrderStock(order)
}
export function scheduleOrder(id: string) {
  if (timers.has(id)) return
  void readDatabase()
    .then((database) => {
      const job = database.settlements[id]
      if (!job || job.dueAt === Number.MAX_SAFE_INTEGER || timers.has(id))
        return
      const timer = setTimeout(
        () => {
          timers.delete(id)
          void updateDatabase((latest) => {
            if (latest.generation !== database.generation) return null
            const order = latest.orders.find((value) => value.id === id)
            return order && settleOrder(latest, order) ? order : null
          })
            .then((order) => {
              if (order) return publishOrder(order)
            })
            .catch(() => undefined)
        },
        Math.max(0, job.dueAt - Date.now()),
      )
      timers.set(id, timer)
    })
    .catch(() => undefined)
}
async function replayEvent(
  type: ResourceEvent['type'],
  request: Request,
  options: DemoEventInput,
) {
  const database = await readDatabase()
  const token =
    request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
  const session = token ? requireUser(database, request) : null
  const candidates = [...history.values()]
    .flat()
    .filter(
      (event) =>
        event.generation === database.generation &&
        event.type === type &&
        (event.type !== 'order.updated' || event.userId === session?.user.id) &&
        (!options.resourceId || event.resourceId === options.resourceId),
    )
  const latest = candidates.at(-1)
  if (!latest) throw new MockError('NOT_FOUND', 404)
  let packet: unknown = structuredClone(latest)
  if (options.mode === 'stale')
    packet = candidates
      .filter((event) => event.resourceId === latest.resourceId)
      .at(-2) ?? {
      ...latest,
      eventId: crypto.randomUUID(),
      version: Math.max(1, latest.version - 1),
      data: { ...latest.data, version: Math.max(1, latest.version - 1) },
    }
  if (options.mode === 'malformed') packet = { ...latest, version: -1 }
  if (options.mode === 'wrong-generation')
    packet = { ...latest, generation: crypto.randomUUID() }
  if (options.mode === 'foreign' && latest.type === 'order.updated')
    packet = {
      ...latest,
      userId: 'foreign-collector',
      data: { ...latest.data, userId: 'foreign-collector' },
    }
  for (const client of clients.values()) {
    if (client.token !== token || client.generation !== database.generation)
      continue
    client.bridge.client.emit(type, packet)
    if (options.mode === 'duplicate') client.bridge.client.emit(type, packet)
  }
}

export async function releasePendingOrders(request: Request) {
  const orders = await updateDatabase((database) => {
    const { user } = requireUser(database, request)
    const changed: Order[] = []
    for (const order of database.orders)
      if (order.userId === user.id && settleOrder(database, order))
        changed.push(order)
    return changed
  })
  for (const order of orders) await publishOrder(order)
}
