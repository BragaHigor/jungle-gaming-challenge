import { useCatalogQuery } from '@/hooks/useNftQueries'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useCart, useCartQuote } from '@/hooks/useCart'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import type { WalletOption } from '@/types/purchase'

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
export function CartRoute() {
  const related = useCatalogQuery({ pageSize: 5 })
  return <CartPage related={related.data?.items ?? []} />
}

export function CheckoutRoute() {
  const { t } = useTranslation('purchase')
  const cart = useCart()
  const quote = useCartQuote()
  const data = quote.query.data
  const ready = Boolean(
    data &&
    !quote.expired &&
    !cart.mutation.isPending &&
    !cart.query.isFetching &&
    !cart.query.isError &&
    !quote.query.isError &&
    !quote.query.isFetching &&
    cart.query.data?.stockValid &&
    (!data.requiresReview || cart.reviewedId === data.id),
  )
  if (!cart.query.data?.lines.length) return <CartPage related={[]} />
  return (
    <>
      {!ready && (
        <div role="alert" className="mb-5 space-y-3 text-sm text-primary">
          <p>{t('returnToCart')}</p>
          <Button asChild variant="outline">
            <Link to="/cart">{t('backToCart')}</Link>
          </Button>
        </div>
      )}
      <CheckoutPage
        items={cart.query.data.lines}
        wallets={wallets}
        totals={data?.totals}
        quoteReady={ready}
      />
    </>
  )
}
