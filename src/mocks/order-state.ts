import type { Database } from './database'
import type { Order } from '@/schemas/api/purchase'

export function settleOrder(database: Database, order: Order) {
  const job = database.settlements[order.id]
  if (order.status !== 'pending' || !job) return false
  const ready = database.orderFaults[order.userId] === 'ready'
  if (Date.now() < job.dueAt && !ready) return false
  order.status = job.outcome
  order.version++
  order.updatedAt = new Date().toISOString()
  order.reference = order.status === 'confirmed' ? `sim-${order.id}` : null
  if (order.status === 'declined') {
    for (const item of order.items) {
      const nft = database.nfts.find((value) => value.id === item.nft.id)!
      const edition = nft.editions.find((value) => value.id === item.editionId)!
      edition.available += item.quantity
      nft.version++
    }
  } else {
    const cart = database.carts.find((value) => value.id === job.cartId)!
    for (const [index, item] of order.items.entries()) {
      const line = cart.items.find((value) => value.id === job.lineIds[index])
      if (line) line.quantity = Math.max(0, line.quantity - item.quantity)
    }
    cart.items = cart.items.filter((value) => value.quantity > 0)
    cart.version++
    if (!cart.items.length) cart.coupon = null
  }
  delete database.settlements[order.id]
  return true
}
