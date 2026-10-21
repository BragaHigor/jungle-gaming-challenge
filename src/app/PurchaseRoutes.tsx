import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { homeCards } from '@/mocks/presentation'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import type { PurchaseItem, WalletOption } from '@/types/purchase'

const items: readonly PurchaseItem[] = [0, 4, 5].map((index, position) => ({
  nft: homeCards[index],
  quantity: [2, 6, 9][position],
  available: 20,
}))
const wallets: readonly WalletOption[] = [
  {
    id: 'reserve',
    name: 'reserve',
    label: 'nova.kurio.eth',
    address: '0x1111111111111111111111111111111111111111',
    network: 'Polygon',
  },
  {
    id: 'primary',
    name: 'primary',
    label: '0xA91F…E82C',
    address: '0xA91F00000000000000000000000000000000E82C',
    network: 'Ethereum',
  },
]
const cartApi = getRouteApi('/cart')

export function CartRoute() {
  const { view } = cartApi.useSearch()
  const navigate = useNavigate()
  return (
    <CartPage
      key={view}
      initialItems={items}
      related={[...homeCards.slice(3, 7), homeCards[8]]}
      state={view}
      onRetry={() => void navigate({ to: '/cart', search: {} })}
    />
  )
}

export function CheckoutRoute() {
  return <CheckoutPage items={items} wallets={wallets} />
}
