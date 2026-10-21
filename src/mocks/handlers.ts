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
async function requireSession(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
  const session = getSession(await readDatabase(), token)
  if (!session) throw new MockError('UNAUTHORIZED', 401)
  return session
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
      const session = await requireSession(request)
      return json({
        userId: session.user.id,
        nftIds: (await readDatabase()).favorites[session.user.id] ?? [],
        version: 1,
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
  http.get('/api/demo', () => respond(async () => json(await getDemoStatus()))),
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
  http.get('/api/cart', ({ request }) =>
    respond(async () => {
      const userId = request.headers.has('Authorization')
        ? (await requireSession(request)).user.id
        : null
      return json(
        (await readDatabase()).carts.find((cart) => cart.userId === userId),
      )
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
      await requireSession(request)
      parseInput(quoteRequestSchema, await jsonBody(request))
      return failure('NOT_IMPLEMENTED', 501)
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
