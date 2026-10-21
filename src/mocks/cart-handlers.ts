import { delay, http, HttpResponse } from 'msw'
import { readDatabase, updateDatabase, type Database } from './database'
import {
  currentCart,
  cartResponse,
  addCartItem,
  checkCartVersion,
  validateCoupon,
  createQuote,
} from './cart'
import { requireUser } from './auth'
import { jsonBody, parseInput, respond, MockError } from './responses'
import { scenarioResponse } from './scenarios'
import { resourceIdSchema } from '@/schemas/api/common'
import {
  cartItemRequestSchema,
  cartQuantityRequestSchema,
  cartVersionRequestSchema,
  couponRequestSchema,
  cartPreviewRequestSchema,
  quoteRequestSchema,
} from '@/schemas/api/purchase'

const json = (data: Parameters<typeof HttpResponse.json>[0]) =>
  HttpResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
async function writeCart<T>(
  request: Request,
  action: (database: Database) => T,
) {
  const snapshot = await readDatabase()
  const cart = currentCart(snapshot, request)
  await delay(snapshot.cartFaults[cart.id] === 'slow' ? 1200 : 100)
  return updateDatabase((database) => {
    if (database.generation !== snapshot.generation)
      throw new MockError('SCENARIO_RESET', 409)
    return action(database)
  })
}

export const cartHandlers = [
  http.get('/api/cart', ({ request }) =>
    respond(async () => {
      const fault = await scenarioResponse(request)
      if (fault) return fault
      const database = await readDatabase()
      const cart = currentCart(database, request)
      if (database.cartFaults[cart.id] === 'slow') await delay(1200)
      const latest = await readDatabase()
      if (latest.generation !== database.generation)
        throw new MockError('SCENARIO_RESET', 409)
      return json(cartResponse(latest, currentCart(latest, request)))
    }),
  ),
  http.post('/api/cart/items', ({ request }) =>
    respond(async () => {
      const input = parseInput(cartItemRequestSchema, await jsonBody(request))
      return json(
        await writeCart(request, (database) => {
          const cart = currentCart(database, request)
          addCartItem(database, cart, input)
          return cartResponse(database, cart)
        }),
      )
    }),
  ),
  http.patch('/api/cart/items/:id', ({ request, params }) =>
    respond(async () => {
      const id = parseInput(resourceIdSchema, params.id)
      const input = parseInput(
        cartQuantityRequestSchema,
        await jsonBody(request),
      )
      return json(
        await writeCart(request, (database) => {
          const cart = currentCart(database, request)
          checkCartVersion(cart, input.cartVersion)
          const item = cart.items.find((line) => line.id === id)
          if (!item) throw new MockError('NOT_FOUND', 404)
          const line = cartResponse(database, cart).lines.find(
            (value) => value.id === id,
          )!
          if (input.quantity > line.available)
            throw new MockError('STOCK_CHANGED', 409)
          item.quantity = input.quantity
          cart.version++
          cart.mergeNotice = 'none'
          return cartResponse(database, cart)
        }),
      )
    }),
  ),
  http.delete('/api/cart/items/:id', ({ request, params }) =>
    respond(async () => {
      const id = parseInput(resourceIdSchema, params.id)
      const input = parseInput(
        cartVersionRequestSchema,
        await jsonBody(request),
      )
      return json(
        await writeCart(request, (database) => {
          const cart = currentCart(database, request)
          checkCartVersion(cart, input.cartVersion)
          if (!cart.items.some((item) => item.id === id))
            throw new MockError('NOT_FOUND', 404)
          cart.items = cart.items.filter((item) => item.id !== id)
          cart.version++
          cart.mergeNotice = 'none'
          return cartResponse(database, cart)
        }),
      )
    }),
  ),
  http.post('/api/cart/coupon', ({ request }) =>
    respond(async () => {
      const input = parseInput(couponRequestSchema, await jsonBody(request))
      return json(
        await writeCart(request, (database) => {
          const cart = currentCart(database, request)
          checkCartVersion(cart, input.cartVersion)
          const coupon = validateCoupon(database, cart, input.code)
          if (cart.coupon !== coupon.code) cart.version++
          cart.coupon = coupon.code
          return cartResponse(database, cart)
        }),
      )
    }),
  ),
  http.delete('/api/cart/coupon', ({ request }) =>
    respond(async () => {
      const input = parseInput(
        cartVersionRequestSchema,
        await jsonBody(request),
      )
      return json(
        await writeCart(request, (database) => {
          const cart = currentCart(database, request)
          checkCartVersion(cart, input.cartVersion)
          if (cart.coupon) cart.version++
          cart.coupon = null
          return cartResponse(database, cart)
        }),
      )
    }),
  ),
  http.post('/api/cart/quote', ({ request }) =>
    respond(async () => {
      const input = parseInput(
        cartPreviewRequestSchema,
        await jsonBody(request),
      )
      return json(
        await writeCart(request, (database) => {
          const cart = currentCart(database, request)
          checkCartVersion(cart, input.cartVersion)
          const lines = cartResponse(database, cart).lines
          if (
            lines.some(
              (line) => input.resourceVersions[line.nftId] !== line.nft.version,
            )
          )
            throw new MockError('CART_CHANGED', 409)
          return createQuote(database, cart, input.network)
        }),
      )
    }),
  ),
  http.post('/api/quotes', ({ request }) =>
    respond(async () => {
      const input = parseInput(quoteRequestSchema, await jsonBody(request))
      return json(
        await writeCart(request, (database) => {
          const session = requireUser(database, request)
          const cart = currentCart(database, request)
          checkCartVersion(cart, input.cartVersion)
          const wallet = database.wallets.find(
            (value) => value.id === input.walletId,
          )
          if (!wallet) throw new MockError('NOT_FOUND', 404)
          if (wallet.userId !== session.user.id)
            throw new MockError('FORBIDDEN', 403)
          if (wallet.draft.network !== input.network)
            throw new MockError('VALIDATION', 422, { network: 'invalid' })
          return createQuote(
            database,
            { ...cart, coupon: input.coupon ?? cart.coupon },
            input.network,
            wallet.id,
          )
        }),
      )
    }),
  ),
]
