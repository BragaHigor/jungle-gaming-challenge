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
export const realtimeHandler = link.addEventListener(
  'connection',
  async (connection) => {
    const database = await readDatabase()
    const token = connection.client.url.searchParams.get('session')
    const session = getSession(database, token)
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
}
async function broadcast(event: ResourceEvent) {
  const database = await readDatabase()
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
) {
  const initial = await readDatabase()
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
      const nft = database.nfts[0]
      nft.price = weiToEth(ethToWei(nft.price) + ethToWei('0.01'))
      nft.editions[2].available = Math.max(0, nft.editions[2].available - 1)
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
      (value) => value.status === 'pending' && value.userId === session.user.id,
    )
    if (!order) throw new MockError('NOT_FOUND', 404)
    order.version += 1
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
  await broadcast(event)
}
