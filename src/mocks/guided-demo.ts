import { getDemoStatus, resetDatabase, updateDatabase } from './database'
import { closeConnections } from './realtime'
import { demoDestination } from '@/constants/demo'
import type { Scenario } from '@/schemas/demo'

export async function prepareGuidedDemo(scenario: Scenario) {
  closeConnections()
  await resetDatabase('pending-order')
  const token = await updateDatabase((database) => {
    const session = database.sessions[0]
    const userId = session.userId
    const cart = database.carts.find((value) => value.userId === userId)!
    const nft = database.nfts[0]
    database.scenario = scenario
    database.favorites[userId] = [nft.id]
    cart.items = [
      { id: 'guided-cart-line', nftId: nft.id, editionId: '1/50', quantity: 1 },
    ]
    const orderScenario =
      scenario.startsWith('order-') || scenario === 'pending-order'
    if (!orderScenario) {
      database.orders = []
      database.quotes = []
      nft.editions[2].available = 50
    }
    const accountFaults = {
      'account-slow': 'slow',
      'account-read-failure': 'read-failure',
      'account-write-failure': 'write-failure',
      'account-validation': 'validation',
    } as const
    const accountFault = accountFaults[scenario as keyof typeof accountFaults]
    if (accountFault) database.accountFaults[userId] = accountFault
    if (scenario === 'order-read-failure')
      database.orderFaults[userId] = 'read-failure'
    if (scenario === 'connection-refused')
      database.orderFaults[userId] = 'connection-refused'
    if (scenario === 'order-confirmed' || scenario === 'order-declined') {
      const order = database.orders[0]
      order.status = scenario === 'order-confirmed' ? 'confirmed' : 'declined'
      order.reference = order.status === 'confirmed' ? `sim-${order.id}` : null
      if (order.status === 'declined') nft.editions[2].available = 50
      if (order.status === 'confirmed') cart.items = []
    }
    const cartFaults = {
      'quote-failure': 'quote-failure',
      'coupon-invalid': 'coupon-invalid',
      'coupon-expired': 'coupon-expired',
      'cart-slow': 'slow',
    } as const
    const cartFault = cartFaults[scenario as keyof typeof cartFaults]
    if (cartFault) database.cartFaults[cart.id] = cartFault
    if (scenario === 'cart-empty') cart.items = []
    if (scenario === 'cart-price-change') {
      nft.price = '1.29'
      nft.version++
    }
    if (scenario === 'cart-stock-change' || scenario === 'sold-out')
      nft.editions[2].available = 0
    if (scenario === 'favorites-failure') database.favoriteFailures.push(userId)
    if (scenario === 'session-expired')
      session.expiresAt = new Date(Date.now() - 1000).toISOString()
    return session.token
  })
  const destination = demoDestination(scenario)
  const privateScreen = [
    '/cart',
    '/profile',
    '/checkout',
    '/confirmation',
  ].some((path) => destination.startsWith(path))
  const needsSession = privateScreen || scenario === 'favorites-failure'
  return getDemoStatus(needsSession ? token : null)
}
