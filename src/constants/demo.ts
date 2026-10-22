import type { Scenario } from '@/schemas/demo'

export function demoDestination(scenario: Scenario) {
  if (scenario === 'session-expired') return '/login?reason=expired'
  if (scenario.startsWith('order-') || scenario === 'pending-order')
    return '/confirmation?orderId=order-demo-pending'
  if (scenario === 'connection-refused') return '/checkout'
  if (scenario.startsWith('account-')) return '/profile'
  if (
    scenario.startsWith('cart-') ||
    scenario.startsWith('coupon-') ||
    scenario === 'quote-failure'
  )
    return '/cart'
  if (scenario === 'sold-out' || scenario === 'favorites-failure')
    return '/nfts/emerald-ape-042'
  if (scenario === 'favorites-ready') return '/profile'
  if (scenario === 'variable-latency') return '/?q=em'
  return '/'
}

export function isDemoDestination(href: string, scenario: Scenario) {
  const base = 'https://kurio.local'
  const current = new URL(href, base)
  const destination = new URL(demoDestination(scenario), base)
  return (
    current.pathname === destination.pathname &&
    [...destination.searchParams].every(
      ([key, value]) => current.searchParams.get(key) === value,
    )
  )
}
