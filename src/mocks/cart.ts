import { getSession, type Database } from './database'
import { MockError } from './responses'
import {
  cartResponseSchema,
  quoteSchema,
  type Cart,
  type CartItemRequest,
} from '@/schemas/api/purchase'
import { ethToWei, weiToEth } from '@/utils/eth'

export function currentCart(database: Database, request: Request): Cart {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
  const session = getSession(database, token)
  if (request.headers.has('Authorization') && !session)
    throw new MockError('UNAUTHORIZED', 401)
  const userId = session?.user.id ?? null
  const cart = database.carts.find((value) => value.userId === userId)
  if (!cart) throw new MockError('NOT_FOUND', 404)
  return cart
}

export function cartResponse(database: Database, cart: Cart) {
  const lines = cart.items.map((item) => {
    const nft = database.nfts.find((value) => value.id === item.nftId)
    if (!nft) throw new MockError('NOT_FOUND', 404)
    const edition = nft.editions.find((value) => value.id === item.editionId)
    return { ...item, nft, available: edition?.available ?? 0 }
  })
  return cartResponseSchema.parse({
    ...cart,
    lines,
    stockValid: lines.every((line) => line.quantity <= line.available),
  })
}

export function checkCartVersion(cart: Cart, version: number) {
  if (cart.version !== version) throw new MockError('CART_CHANGED', 409)
}

export function addCartItem(
  database: Database,
  cart: Cart,
  input: CartItemRequest,
) {
  const nft = database.nfts.find((value) => value.id === input.nftId)
  if (!nft) throw new MockError('NOT_FOUND', 404)
  const edition = nft.editions.find((value) => value.id === input.editionId)
  if (!edition) throw new MockError('NOT_FOUND', 404)
  const existing = cart.items.find(
    (value) =>
      value.nftId === input.nftId && value.editionId === input.editionId,
  )
  const quantity = (existing?.quantity ?? 0) + input.quantity
  if (quantity > edition.available || quantity > 99)
    throw new MockError('STOCK_CHANGED', 409)
  if (existing) existing.quantity = quantity
  else cart.items.push({ ...input, id: crypto.randomUUID() })
  cart.version++
  cart.mergeNotice = 'none'
}

export function mergeVisitorCart(database: Database, userId: string) {
  const visitor = database.carts.find((cart) => cart.userId === null)!
  const target = database.carts.find((cart) => cart.userId === userId)!
  if (!visitor.items.length) return
  const previousCoupon = target.coupon
  const previousNotice = target.mergeNotice
  let moved = false
  for (const item of visitor.items) {
    const existing = target.items.find(
      (line) => line.nftId === item.nftId && line.editionId === item.editionId,
    )
    const nft = database.nfts.find((value) => value.id === item.nftId)
    const available =
      nft?.editions.find((edition) => edition.id === item.editionId)
        ?.available ?? 0
    const quantity = Math.min(
      item.quantity,
      Math.max(0, available - (existing?.quantity ?? 0)),
    )
    if (!quantity) continue
    if (existing) existing.quantity += quantity
    else target.items.push({ ...item, id: crypto.randomUUID(), quantity })
    item.quantity -= quantity
    moved = true
  }
  visitor.items = visitor.items.filter((item) => item.quantity > 0)
  if (!target.coupon && visitor.coupon) target.coupon = visitor.coupon
  target.mergeNotice = visitor.items.length ? 'partial' : 'merged'
  if (
    moved ||
    target.coupon !== previousCoupon ||
    target.mergeNotice !== previousNotice
  )
    target.version++
  if (moved) visitor.version++
  if (!visitor.items.length) visitor.coupon = null
}

export function validateCoupon(database: Database, cart: Cart, code: string) {
  const normalized = code.trim().toUpperCase()
  const coupon = database.coupons.find((value) => value.code === normalized)
  const fault = database.cartFaults[cart.id]
  if (!coupon || fault === 'coupon-invalid')
    throw new MockError('COUPON_INVALID', 422)
  if (Date.parse(coupon.expiresAt) <= Date.now() || fault === 'coupon-expired')
    throw new MockError('COUPON_EXPIRED', 422)
  return coupon
}

export function createQuote(
  database: Database,
  cart: Cart,
  network: 'Ethereum' | 'Polygon' | 'Solana',
  walletId: string | null = null,
) {
  if (database.cartFaults[cart.id] === 'quote-failure')
    throw new MockError('UNAVAILABLE', 503)
  const response = cartResponse(database, cart)
  if (!response.lines.length) throw new MockError('VALIDATION', 422)
  if (!response.stockValid) throw new MockError('STOCK_CHANGED', 409)
  const coupon = cart.coupon
    ? validateCoupon(database, cart, cart.coupon)
    : null
  const resourceVersions = Object.fromEntries(
    response.lines.map((line) => [line.nftId, line.nft.version]),
  )
  const previous = database.quotes
    .filter(
      (quote) =>
        quote.cartId === cart.id &&
        quote.walletId === walletId &&
        quote.network === network,
    )
    .at(-1)
  const now = Date.now()
  const sameResources =
    previous &&
    JSON.stringify(previous.resourceVersions) ===
      JSON.stringify(resourceVersions)
  if (
    previous &&
    sameResources &&
    previous.cartVersion === cart.version &&
    previous.coupon === cart.coupon &&
    Date.parse(previous.expiresAt) > now
  )
    return previous
  const items = response.lines.map((line) => ({
    nft: line.nft,
    editionId: line.editionId,
    quantity: line.quantity,
    unitPrice: line.nft.price,
    subtotal: weiToEth(ethToWei(line.nft.price) * BigInt(line.quantity)),
  }))
  const subtotal = items.reduce(
    (sum, line) => sum + ethToWei(line.subtotal),
    0n,
  )
  const discount = (subtotal * BigInt(coupon?.percent ?? 0)) / 100n
  const fees = { Ethereum: '0.016', Polygon: '0.002', Solana: '0.0005' }
  const fee = fees[network]
  const changed =
    previous &&
    response.lines.some(
      (line) =>
        previous.resourceVersions[line.nftId] !== undefined &&
        previous.resourceVersions[line.nftId] !== line.nft.version,
    )
  const requiresReview = Boolean(
    changed ||
    previous?.requiresReview ||
    (previous && Date.parse(previous.expiresAt) <= now),
  )
  const quote = quoteSchema.parse({
    id: crypto.randomUUID(),
    cartId: cart.id,
    userId: cart.userId,
    walletId,
    network,
    cartVersion: cart.version,
    coupon: cart.coupon,
    resourceVersions,
    requiresReview,
    items,
    totals: {
      subtotal: weiToEth(subtotal),
      discount: weiToEth(discount),
      fee,
      total: weiToEth(subtotal - discount + ethToWei(fee)),
    },
    expiresAt: new Date(now + 120000).toISOString(),
    version: (previous?.version ?? 0) + 1,
  })
  database.quotes = database.quotes.filter(
    (value) =>
      value.cartId !== cart.id ||
      value.walletId !== walletId ||
      value.network !== network ||
      database.orders.some((order) => order.quoteId === value.id),
  )
  database.quotes.push(quote)
  return quote
}
