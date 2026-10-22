import { orderHandlers } from './order-handlers'
import { accountHandlers } from './account-handlers'
import { currentCart } from './cart'
import { cartHandlers } from './cart-handlers'
import { http, HttpResponse } from 'msw'
import { catalogResponseSchema, nftSchema } from '@/schemas/api/catalog'
import {
  demoRequestSchema,
  demoEventRequestSchema,
  demoConnectionSchema,
} from '@/schemas/demo'
import { resourceIdSchema } from '@/schemas/api/common'
import {
  loginRequestSchema,
  registrationRequestSchema,
  favoriteRequestSchema,
} from '@/schemas/api/account'
import {
  getDemoStatus,
  readDatabase,
  resetDatabase,
  updateDatabase,
} from './database'
import {
  closeConnections,
  emitResourceEvent,
  changeConnection,
  releasePendingOrders,
} from './realtime'
import { listNfts } from './catalog'
import { failure, jsonBody, MockError, parseInput, respond } from './responses'
import { scenarioResponse } from './scenarios'
import { login, register, requireUser } from './auth'
import { delay } from 'msw'

const json = (data: Parameters<typeof HttpResponse.json>[0]) =>
  HttpResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
async function requireSession(request: Request) {
  return requireUser(await readDatabase(), request)
}
const privateReads = [
  http.get('/api/session', ({ request }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      return json(await requireSession(request))
    }),
  ),
  http.get('/api/favorites', ({ request }) =>
    respond(async () => {
      const database = await readDatabase()
      const session = requireUser(database, request)
      return json({
        userId: session.user.id,
        nftIds: database.favorites[session.user.id] ?? [],
        version: database.favoriteVersions[session.user.id] ?? 1,
      })
    }),
  ),
]
export const handlers = [
  http.get('/api/demo', ({ request }) =>
    respond(async () =>
      json(
        await getDemoStatus(
          request.headers.get('Authorization')?.replace(/^Bearer /, ''),
        ),
      ),
    ),
  ),
  http.post('/api/demo/reset', ({ request }) =>
    respond(async () => {
      const { scenario } = parseInput(
        demoRequestSchema,
        await jsonBody(request),
      )
      if (scenario.startsWith('order-') || scenario === 'connection-refused') {
        await updateDatabase((database) => {
          const { user } = requireUser(database, request)
          const faults = {
            'order-read-failure': 'read-failure',
            'order-confirmed': 'ready',
            'order-declined': 'declined',
            'order-timeout': 'timeout',
            'order-pending': 'pending',
            'connection-refused': 'connection-refused',
          } as const
          database.orderFaults[user.id] =
            faults[scenario as keyof typeof faults]
        })
        if (scenario === 'order-confirmed') await releasePendingOrders(request)
        return json(
          await getDemoStatus(
            request.headers.get('Authorization')?.replace(/^Bearer /, ''),
          ),
        )
      }
      if (scenario.startsWith('account-')) {
        await updateDatabase((database) => {
          const { user } = requireUser(database, request)
          const faults = {
            'account-slow': 'slow',
            'account-read-failure': 'read-failure',
            'account-write-failure': 'write-failure',
            'account-validation': 'validation',
          } as const
          const fault = faults[scenario as keyof typeof faults]
          if (fault) database.accountFaults[user.id] = fault
          else delete database.accountFaults[user.id]
        })
        return json(
          await getDemoStatus(
            request.headers.get('Authorization')?.replace(/^Bearer /, ''),
          ),
        )
      }
      const cartScenarios = [
        'cart-empty',
        'coupon-invalid',
        'coupon-expired',
        'quote-failure',
        'cart-price-change',
        'cart-stock-change',
        'cart-ready',
        'cart-slow',
      ]
      if (cartScenarios.includes(scenario)) {
        if (
          scenario === 'cart-price-change' ||
          scenario === 'cart-stock-change'
        ) {
          const database = await readDatabase()
          const cart = currentCart(database, request)
          const item = cart.items[0]
          await emitResourceEvent('nft.updated', request, {
            nftId: item?.nftId ?? database.nfts[0].id,
            editionId: item?.editionId ?? '1/50',
            soldOut: scenario === 'cart-stock-change',
          })
        } else {
          await updateDatabase((database) => {
            const cart = currentCart(database, request)
            if (scenario === 'cart-empty') {
              cart.items = []
              cart.coupon = null
              cart.version++
              return
            }
            if (scenario === 'cart-ready') {
              delete database.cartFaults[cart.id]
              return
            }
            if (scenario === 'cart-slow') {
              database.cartFaults[cart.id] = 'slow'
              return
            }
            if (
              scenario === 'coupon-invalid' ||
              scenario === 'coupon-expired' ||
              scenario === 'quote-failure'
            )
              database.cartFaults[cart.id] = scenario
          })
        }
        return json(
          await getDemoStatus(
            request.headers.get('Authorization')?.replace(/^Bearer /, ''),
          ),
        )
      }
      if (
        ['session-expired', 'favorites-failure', 'favorites-ready'].includes(
          scenario,
        )
      ) {
        await updateDatabase((database) => {
          const session = requireUser(database, request)
          if (scenario === 'session-expired') {
            const record = database.sessions.find(
              (value) => value.token === session.token,
            )!
            record.expiresAt = new Date(Date.now() - 1000).toISOString()
          } else {
            database.favoriteFailures = database.favoriteFailures.filter(
              (id) => id !== session.user.id,
            )
            if (scenario === 'favorites-failure')
              database.favoriteFailures.push(session.user.id)
          }
        })
        return json(
          await getDemoStatus(
            request.headers.get('Authorization')?.replace(/^Bearer /, ''),
          ),
        )
      }
      const status = await resetDatabase(scenario)
      closeConnections()
      return json(status)
    }),
  ),
  http.post('/api/demo/connection', ({ request }) =>
    respond(async () => {
      const { action } = parseInput(
        demoConnectionSchema,
        await jsonBody(request),
      )
      await changeConnection(request, action)
      return json({ action })
    }),
  ),
  http.post('/api/demo/events', ({ request }) =>
    respond(async () => {
      const input = parseInput(demoEventRequestSchema, await jsonBody(request))
      await emitResourceEvent(input.type, request, undefined, input)
      return json({ emitted: true })
    }),
  ),
  http.get('/api/nfts', ({ request }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      if ((await readDatabase()).scenario === 'malformed-response')
        return json({ items: [], total: 'invalid', page: 1, pageSize: 9 })
      return json(
        parseInput(catalogResponseSchema, await listNfts(new URL(request.url))),
      )
    }),
  ),
  http.get('/api/nfts/:id', ({ request, params }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      if ((await readDatabase()).scenario === 'malformed-response')
        return json({ id: params.id, price: 1 })
      const id = parseInput(resourceIdSchema, params.id)
      const nft = (await readDatabase()).nfts.find((value) => value.id === id)
      if (!nft) return failure('NOT_FOUND', 404)
      return json(parseInput(nftSchema, nft))
    }),
  ),
  ...cartHandlers,
  ...privateReads,
  ...accountHandlers,
  http.post('/api/auth/login', ({ request }) =>
    respond(async () => {
      const input = parseInput(loginRequestSchema, await jsonBody(request))
      await delay(150)
      return json(await login(input.email, input.password))
    }),
  ),
  http.post('/api/auth/register', ({ request }) =>
    respond(async () => {
      const input = parseInput(
        registrationRequestSchema,
        await jsonBody(request),
      )
      await delay(150)
      return json(await register(input))
    }),
  ),
  http.post('/api/auth/logout', ({ request }) =>
    respond(async () => {
      await updateDatabase((database) => {
        const session = requireUser(database, request)
        database.sessions = database.sessions.filter(
          (value) => value.token !== session.token,
        )
      })
      return json({ revoked: true })
    }),
  ),
  http.all('/api/favorites', ({ request }) =>
    respond(async () => {
      if (!['POST', 'DELETE'].includes(request.method))
        return failure('NOT_FOUND', 404)
      const { nftId } = parseInput(
        favoriteRequestSchema,
        await jsonBody(request),
      )
      const generation = (await readDatabase()).generation
      await delay(450)
      const result = await updateDatabase((database) => {
        if (database.generation !== generation)
          throw new MockError('SCENARIO_RESET', 409)
        const session = requireUser(database, request)
        const userId = session.user.id
        if (database.favoriteFailures.includes(userId))
          throw new MockError('UNAVAILABLE', 503)
        if (!database.nfts.some((nft) => nft.id === nftId))
          throw new MockError('NOT_FOUND', 404)
        const current = database.favorites[userId] ?? []
        const ids = new Set(current)
        if (request.method === 'POST') ids.add(nftId)
        else ids.delete(nftId)
        const nftIds = Array.from(ids)
        const changed = current.length !== nftIds.length
        const version =
          (database.favoriteVersions[userId] ?? 1) + Number(changed)
        database.favorites[userId] = nftIds
        database.favoriteVersions[userId] = version
        return { userId, nftIds, version }
      })
      return json(result)
    }),
  ),
  ...orderHandlers,
  http.all('/api/*', () => failure('NOT_FOUND', 404)),
]
