import { useRealtimeStatus } from '@/hooks/useDemo'
import { PurchaseHeader } from '@/components/purchase/PurchaseHeader'
import { OrderRecovery } from '@/components/purchase/OrderRecovery'
import { useState } from 'react'
import { useCatalogQuery } from '@/hooks/useNftQueries'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useCart, useCartQuote } from '@/hooks/useCart'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { useProfileData, useWalletsData } from '@/hooks/useAccountData'
import { useSession } from '@/hooks/useSession'
import { QueryFeedback } from '@/components/shared/QueryFeedback'
import { AccountState } from '@/components/account/AccountState'
import type { WalletOption } from '@/types/purchase'

export function CartRoute() {
  const related = useCatalogQuery({ pageSize: 5 })
  return <CartPage related={related.data?.items ?? []} />
}

export function CheckoutRoute() {
  return (
    <>
      <PurchaseHeader checkout />
      <CheckoutContent />
    </>
  )
}

function CheckoutContent() {
  const { t } = useTranslation('purchase')
  const { session } = useSession()
  const { query: walletQuery } = useWalletsData()
  const { query: profileQuery } = useProfileData()
  const profile = profileQuery.data ?? session?.user
  const primary = walletQuery.data?.find((wallet) => wallet.primary)
  const wallets: WalletOption[] = (walletQuery.data ?? [])
    .filter((wallet) => wallet.primary || !primary?.sameAsPrimary)
    .map((wallet) => ({
      id: wallet.id,
      name: wallet.primary ? 'primary' : 'reserve',
      label: wallet.label,
      address: wallet.draft.address,
      network: wallet.draft.network,
      walletType: wallet.draft.walletType,
      collector: wallet.draft,
    }))
  const { synchronizing } = useRealtimeStatus()
  const cart = useCart()
  const [selectedNetwork, setSelectedNetwork] = useState<
    WalletOption['network'] | null
  >(null)
  const quote = useCartQuote(
    selectedNetwork ?? wallets[0]?.network ?? 'Ethereum',
  )
  const data = quote.query.data
  const ready = Boolean(
    data &&
    !synchronizing &&
    !quote.expired &&
    !cart.mutation.isPending &&
    !cart.query.isFetching &&
    !cart.query.isError &&
    !quote.query.isError &&
    !quote.query.isFetching &&
    cart.query.data?.stockValid &&
    (!data.requiresReview || cart.reviewedId === data.id),
  )
  const showCartWarning =
    !ready &&
    Boolean(
      quote.query.isError ||
      quote.expired ||
      data?.requiresReview ||
      cart.query.isError ||
      cart.query.data?.stockValid === false,
    )
  if (!cart.query.data)
    return (
      <AccountState
        state={cart.query.isError ? 'error' : 'loading'}
        onRetry={() => void cart.query.refetch()}
      />
    )
  if (!cart.query.data.lines.length)
    return (
      <>
        <OrderRecovery />
        <section className="py-16 text-center">
          <h2 className="mb-6 text-xl">{t('empty')}</h2>
          <Button asChild>
            <Link to="/">{t('continue')}</Link>
          </Button>
        </section>
      </>
    )

  return (
    <>
      {showCartWarning && (
        <div role="alert" className="mb-5 space-y-3 text-sm text-primary">
          <p>{t('returnToCart')}</p>
          <Button asChild variant="outline">
            <Link to="/cart">{t('backToCart')}</Link>
          </Button>
        </div>
      )}
      <QueryFeedback query={walletQuery} resource="account" />
      <QueryFeedback query={profileQuery} resource="account" />
      {!walletQuery.data && (
        <AccountState
          state={walletQuery.isError ? 'error' : 'loading'}
          onRetry={() => void walletQuery.refetch()}
        />
      )}
      {walletQuery.data && !wallets.length && (
        <p role="status" className="my-5 text-sm">
          {t('noWallets')}{' '}
          <Link to="/wallets" className="underline">
            {t('manageWallets')}
          </Link>
        </p>
      )}
      {walletQuery.data && !profileQuery.isFetched && (
        <AccountState
          state="loading"
          onRetry={() => void profileQuery.refetch()}
        />
      )}
      {walletQuery.data && profileQuery.isFetched && (
        <CheckoutPage
          key={session?.token}
          items={cart.query.data.lines}
          wallets={wallets}
          collectorDefaults={{
            displayName: profile?.displayName,
            username: profile?.username,
            email: profile?.email,
            ens: profileQuery.data?.ens,
          }}
          totals={data?.totals}
          quoteId={data?.id}
          quotedNetwork={data?.network}
          quoteReady={ready && wallets.length > 0 && !walletQuery.isError}
          quoteLoading={
            quote.query.isFetching ||
            cart.query.isFetching ||
            cart.mutation.isPending
          }
          onNetworkChange={setSelectedNetwork}
        />
      )}
    </>
  )
}
