import { currentCart } from './cart'
import { cartHandlers } from './cart-handlers'
import { http, HttpResponse } from 'msw'
import { catalogResponseSchema, nftSchema } from '@/schemas/api/catalog'
import { demoRequestSchema, demoEventRequestSchema } from '@/schemas/demo'
import { resourceIdSchema } from '@/schemas/api/common'
import {
  loginRequestSchema,
  registrationRequestSchema,
  favoriteRequestSchema,
} from '@/schemas/api/account'
import {
  idempotencyKeySchema,
  orderRequestSchema,
} from '@/schemas/api/purchase'
import {
  getDemoStatus,
  readDatabase,
  resetDatabase,
  updateDatabase,
} from './database'
import { closeConnections, emitResourceEvent } from './realtime'
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
  http.get('/api/profile', ({ request }) =>
    respond(async () => {
      const session = await requireSession(request)
      return json(
        (await readDatabase()).profiles.find(
          (profile) => profile.id === session.user.id,
        ),
      )
    }),
  ),
  http.get('/api/wallets', ({ request }) =>
    respond(async () => {
      const session = await requireSession(request)
      return json(
        (await readDatabase()).wallets.filter(
          (wallet) => wallet.userId === session.user.id,
        ),
      )
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
  http.get('/api/orders/:id', ({ request, params }) =>
    respond(async () => {
      const session = await requireSession(request)
      const id = parseInput(resourceIdSchema, params.id)
      const order = (await readDatabase()).orders.find(
        (value) => value.id === id,
      )
      if (!order) return failure('NOT_FOUND', 404)
      if (order.userId !== session.user.id) return failure('FORBIDDEN', 403)
      return json(order)
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
  http.post('/api/demo/events', ({ request }) =>
    respond(async () => {
      const { type } = parseInput(
        demoEventRequestSchema,
        await jsonBody(request),
      )
      await emitResourceEvent(type, request)
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
  http.post('/api/orders', ({ request }) =>
    respond(async () => {
      await requireSession(request)
      parseInput(idempotencyKeySchema, request.headers.get('Idempotency-Key'))
      parseInput(orderRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
    }),
  ),
  http.all('/api/*', () => failure('NOT_FOUND', 404)),
]
