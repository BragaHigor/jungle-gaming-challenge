import { delay, http, HttpResponse } from 'msw'
import { updateDatabase } from './database'
import { requireUser } from './auth'
import { currentCart, createQuote } from './cart'
import { MockError, respond, jsonBody, parseInput } from './responses'
import {
  connectionRequestSchema,
  idempotencyKeySchema,
  orderRequestSchema,
  orderSchema,
  type Order,
} from '@/schemas/api/purchase'
import { resourceIdSchema } from '@/schemas/api/common'
import { publishOrder, scheduleOrder } from './realtime'
import { settleOrder } from './order-state'

const json = (data: Parameters<typeof HttpResponse.json>[0]) =>
  HttpResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })

export const orderHandlers = [
  http.post('/api/wallet-connections', ({ request }) =>
    respond(async () => {
      const input = parseInput(connectionRequestSchema, await jsonBody(request))
      await delay(250)
      const connection = await updateDatabase((database) => {
        const session = requireUser(database, request)
        if (database.orderFaults[session.user.id] === 'connection-refused')
          throw new MockError('CONFLICT', 409)
        if (input.walletId) {
          const wallet = database.wallets.find(
            (value) => value.id === input.walletId,
          )
          if (!wallet) throw new MockError('NOT_FOUND', 404)
          if (wallet.userId !== session.user.id)
            throw new MockError('FORBIDDEN', 403)
          if (
            wallet.draft.address !== input.address ||
            wallet.draft.network !== input.network
          )
            throw new MockError('CONFLICT', 409)
        }
        const connection = {
          ...input,
          id: crypto.randomUUID(),
          userId: session.user.id,
          token: session.token,
          connected: true,
        }
        database.connections = database.connections.filter(
          (value) => value.token !== session.token,
        )
        database.connections.push(connection)
        return connection
      })
      return json(connection)
    }),
  ),
  http.delete('/api/wallet-connections/:id', ({ request, params }) =>
    respond(async () => {
      const id = parseInput(resourceIdSchema, params.id)
      await updateDatabase((database) => {
        const session = requireUser(database, request)
        const connection = database.connections.find((value) => value.id === id)
        if (!connection) throw new MockError('NOT_FOUND', 404)
        if (
          connection.userId !== session.user.id ||
          connection.token !== session.token
        )
          throw new MockError('FORBIDDEN', 403)
        connection.connected = false
      })
      return json({ disconnected: true })
    }),
  ),
  http.post('/api/orders', ({ request }) =>
    respond(async () => {
      const key = parseInput(
        idempotencyKeySchema,
        request.headers.get('Idempotency-Key'),
      )
      const input = parseInput(orderRequestSchema, await jsonBody(request))
      const fingerprint = JSON.stringify(input)
      let timeout = false
      const order = await updateDatabase((database) => {
        const session = requireUser(database, request)
        const identity = `${session.user.id}:${key}`
        const previous = database.idempotency[identity]
        if (previous) {
          if (previous.fingerprint !== fingerprint)
            throw new MockError('CONFLICT', 409)
          const saved = database.orders.find(
            (value) => value.id === previous.orderId,
          )!
          settleOrder(database, saved)
          return saved
        }
        if (
          database.orders.some(
            (value) =>
              value.userId === session.user.id && value.status === 'pending',
          )
        )
          throw new MockError('CONFLICT', 409)
        const connection = database.connections.find(
          (value) => value.id === input.connectionId,
        )
        if (
          !connection ||
          !connection.connected ||
          connection.userId !== session.user.id ||
          connection.token !== session.token
        )
          throw new MockError('FORBIDDEN', 403)
        if (
          (connection.walletId ?? 'external') !== input.walletId ||
          connection.address !== input.collector.address ||
          connection.network !== input.collector.network ||
          connection.provider !== input.collector.walletType
        )
          throw new MockError('CONFLICT', 409)
        const quote = database.quotes.find(
          (value) => value.id === input.quoteId,
        )
        const cart = currentCart(database, request)
        if (
          !quote ||
          quote.userId !== session.user.id ||
          quote.cartId !== cart.id
        )
          throw new MockError('NOT_FOUND', 404)
        if (
          Date.parse(quote.expiresAt) <= Date.now() ||
          quote.cartVersion !== cart.version ||
          quote.network !== connection.network ||
          (quote.walletId && quote.walletId !== connection.walletId)
        )
          throw new MockError('CART_CHANGED', 409)
        if (connection.walletId) {
          const wallet = database.wallets.find(
            (value) => value.id === connection.walletId,
          )
          if (
            !wallet ||
            wallet.draft.address !== connection.address ||
            wallet.draft.network !== connection.network
          )
            throw new MockError('CONFLICT', 409)
        }
        const current = createQuote(
          database,
          cart,
          quote.network,
          quote.walletId,
        )
        if (
          current.id !== quote.id ||
          JSON.stringify(current.totals) !== JSON.stringify(quote.totals)
        )
          throw new MockError('CART_CHANGED', 409)
        const now = new Date().toISOString()
        const order = orderSchema.parse({
          id: crypto.randomUUID(),
          userId: session.user.id,
          status: 'pending',
          quoteId: quote.id,
          walletId: input.walletId,
          walletAddress: connection.address,
          walletProvider: connection.provider,
          network: quote.network,
          collector: input.collector,
          items: structuredClone(quote.items),
          totals: structuredClone(quote.totals),
          reference: null,
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        for (const item of order.items) {
          const nft = database.nfts.find((value) => value.id === item.nft.id)!
          const edition = nft.editions.find(
            (value) => value.id === item.editionId,
          )!
          if (edition.available < item.quantity)
            throw new MockError('STOCK_CHANGED', 409)
          edition.available -= item.quantity
          nft.version++
        }
        const mode = database.orderFaults[session.user.id]
        timeout = mode === 'timeout'
        database.settlements[order.id] = {
          dueAt:
            mode === 'pending' ? Number.MAX_SAFE_INTEGER : Date.now() + 2200,
          outcome: mode === 'declined' ? 'declined' : 'confirmed',
          cartId: cart.id,
          lineIds: cart.items.map((value) => value.id),
        }
        database.orders.push(order)
        database.idempotency[identity] = {
          userId: session.user.id,
          fingerprint,
          orderId: order.id,
        }
        return order
      })
      await publishOrder(order)
      scheduleOrder(order.id)
      if (timeout) await delay(4000)
      return json(order)
    }),
  ),
  http.get('/api/orders', ({ request }) =>
    respond(async () => {
      const changed: Order[] = []
      const orders = await updateDatabase((database) => {
        const { user } = requireUser(database, request)
        if (database.orderFaults[user.id] === 'read-failure')
          throw new MockError('UNAVAILABLE', 503)
        const own = database.orders.filter((value) => value.userId === user.id)
        for (const order of own)
          if (settleOrder(database, order)) changed.push(order)
        return own
      })
      for (const order of changed) await publishOrder(order)
      for (const order of orders)
        if (order.status === 'pending') scheduleOrder(order.id)
      return json(orders)
    }),
  ),
  http.get('/api/orders/:id', ({ request, params }) =>
    respond(async () => {
      const id = parseInput(resourceIdSchema, params.id)
      const result = await updateDatabase((database) => {
        const { user } = requireUser(database, request)
        if (database.orderFaults[user.id] === 'read-failure')
          throw new MockError('UNAVAILABLE', 503)
        const order = database.orders.find((value) => value.id === id)
        if (!order) throw new MockError('NOT_FOUND', 404)
        if (order.userId !== user.id) throw new MockError('FORBIDDEN', 403)
        return { changed: settleOrder(database, order), order }
      })
      if (result.changed) await publishOrder(result.order)
      if (result.order.status === 'pending') scheduleOrder(result.order.id)
      return json(result.order)
    }),
  ),
]
