import { http, HttpResponse } from 'msw'
import { catalogResponseSchema, nftSchema } from '@/schemas/api/catalog'
import { demoRequestSchema, demoEventRequestSchema } from '@/schemas/demo'
import { resourceIdSchema } from '@/schemas/api/common'
import {
  loginRequestSchema,
  registrationRequestSchema,
} from '@/schemas/api/account'
import {
  cartItemRequestSchema,
  idempotencyKeySchema,
  orderRequestSchema,
  quoteRequestSchema,
} from '@/schemas/api/purchase'
import {
  getDemoStatus,
  getSession,
  readDatabase,
  resetDatabase,
} from './database'
import { closeConnections, emitResourceEvent } from './realtime'
import { listNfts } from './catalog'
import { failure, jsonBody, MockError, parseInput, respond } from './responses'
import { scenarioResponse } from './scenarios'

const json = (data: Parameters<typeof HttpResponse.json>[0]) =>
  HttpResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
function requireSession(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
  const session = getSession(readDatabase(), token)
  if (!session) throw new MockError('UNAUTHORIZED', 401)
  return session
}
const privateReads = [
  http.get('/api/session', ({ request }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      return json(requireSession(request))
    }),
  ),
  http.get('/api/profile', ({ request }) =>
    respond(() => {
      const session = requireSession(request)
      return json(
        readDatabase().profiles.find(
          (profile) => profile.id === session.user.id,
        ),
      )
    }),
  ),
  http.get('/api/wallets', ({ request }) =>
    respond(() => {
      const session = requireSession(request)
      return json(
        readDatabase().wallets.filter(
          (wallet) => wallet.userId === session.user.id,
        ),
      )
    }),
  ),
  http.get('/api/favorites', ({ request }) =>
    respond(() => {
      const session = requireSession(request)
      return json({
        userId: session.user.id,
        nftIds: readDatabase().favorites[session.user.id] ?? [],
        version: 1,
      })
    }),
  ),
  http.get('/api/orders/:id', ({ request, params }) =>
    respond(() => {
      const session = requireSession(request)
      const id = parseInput(resourceIdSchema, params.id)
      const order = readDatabase().orders.find((value) => value.id === id)
      if (!order) return failure('NOT_FOUND', 404)
      if (order.userId !== session.user.id) return failure('FORBIDDEN', 403)
      return json(order)
    }),
  ),
]
export const handlers = [
  http.get('/api/demo', () => respond(() => json(getDemoStatus()))),
  http.post('/api/demo/reset', ({ request }) =>
    respond(async () => {
      const { scenario } = parseInput(
        demoRequestSchema,
        await jsonBody(request),
      )
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
      await emitResourceEvent(type)
      return json({ emitted: true })
    }),
  ),
  http.get('/api/nfts', ({ request }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      if (readDatabase().scenario === 'malformed-response')
        return json({ items: [], total: 'invalid', page: 1, pageSize: 9 })
      return json(
        parseInput(catalogResponseSchema, listNfts(new URL(request.url))),
      )
    }),
  ),
  http.get('/api/nfts/:id', ({ request, params }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      const id = parseInput(resourceIdSchema, params.id)
      const nft = readDatabase().nfts.find((value) => value.id === id)
      if (!nft) return failure('NOT_FOUND', 404)
      return json(parseInput(nftSchema, nft))
    }),
  ),
  http.get('/api/cart', ({ request }) =>
    respond(() => {
      const userId = request.headers.has('Authorization')
        ? requireSession(request).user.id
        : null
      return json(readDatabase().carts.find((cart) => cart.userId === userId))
    }),
  ),
  ...privateReads,
  http.post('/api/auth/login', ({ request }) =>
    respond(async () => {
      parseInput(loginRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
    }),
  ),
  http.post('/api/auth/register', ({ request }) =>
    respond(async () => {
      parseInput(registrationRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
    }),
  ),
  http.post('/api/cart/items', ({ request }) =>
    respond(async () => {
      parseInput(cartItemRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
    }),
  ),
  http.post('/api/quotes', ({ request }) =>
    respond(async () => {
      requireSession(request)
      parseInput(quoteRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
    }),
  ),
  http.post('/api/orders', ({ request }) =>
    respond(async () => {
      requireSession(request)
      parseInput(idempotencyKeySchema, request.headers.get('Idempotency-Key'))
      parseInput(orderRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
    }),
  ),
  http.all('/api/*', () => failure('NOT_FOUND', 404)),
]
