import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PurchaseHeader } from '@/components/purchase/PurchaseHeader'
import { PurchaseItems } from '@/components/purchase/PurchaseItems'
import { OrderSummary } from '@/components/purchase/OrderSummary'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard } from '@/components/catalog/NftCard'
import type { PurchaseItem } from '@/types/purchase'
import type { CatalogNft } from '@/types/catalog'
import { useCart, useCartQuote } from '@/hooks/useCart'
import { ApiError } from '@/api/client'

export function CartPage({ related }: { related: readonly CatalogNft[] }) {
  const { t } = useTranslation('purchase')
  const { t: card } = useTranslation('card')
  const cart = useCart()
  const quote = useCartQuote()
  const data = cart.query.data
  const items: readonly PurchaseItem[] = data?.lines ?? []
  const loading = cart.query.isPending
  const failure = cart.query.isError && !data
  const busy = cart.mutation.isPending || cart.query.isFetching
  const needsReview = Boolean(
    quote.query.data?.requiresReview && cart.reviewedId !== quote.query.data.id,
  )
  const invalidStock = data && !data.stockValid
  const unavailable =
    busy ||
    quote.query.isFetching ||
    !quote.query.data ||
    quote.query.isError ||
    cart.query.isError ||
    quote.expired ||
    needsReview ||
    invalidStock
  const needsRecalculation = quote.query.isError || quote.expired
  const couponFailure =
    quote.query.error instanceof ApiError &&
    ['COUPON_INVALID', 'COUPON_EXPIRED'].includes(quote.query.error.code)
  let quoteError: 'quoteError' | 'couponExpired' | 'couponInvalid' =
    'quoteError'
  if (couponFailure) quoteError = 'couponExpired'
  if (
    quote.query.error instanceof ApiError &&
    quote.query.error.code === 'COUPON_INVALID'
  )
    quoteError = 'couponInvalid'
  const mutationType = cart.mutation.variables?.action.type
  const writeFailed =
    cart.mutation.isError &&
    (mutationType === 'quantity' || mutationType === 'remove')
  const onRetry = () => void cart.query.refetch()
  const renderCartContent = () => {
    if (failure)
      return (
        <div
          className="rounded-lg border border-border p-8 text-center"
          role="status"
        >
          <h2 className="mb-4 text-lg">{t('loadError')}</h2>
          <Button onClick={onRetry}>{t('retry')}</Button>
        </div>
      )
    if (!items.length && !loading)
      return (
        <div className="py-16 text-center" role="status">
          <h2 className="mb-6 text-xl">{t('empty')}</h2>
          <Button asChild>
            <Link to="/">{t('continue')}</Link>
          </Button>
        </div>
      )
    return (
      <div className="grid items-start gap-10 desktop:grid-cols-[minmax(0,1fr)_332px] desktop:gap-16">
        <section
          aria-label={t('items')}
          aria-busy={loading}
          className="min-w-0"
        >
          {loading ? (
            <div className="space-y-3" role="status" aria-label={t('loading')}>
              {[0, 1, 2].map((n) => (
                <Skeleton key={n} className="h-[100px] tablet:h-[70px]" />
              ))}
            </div>
          ) : (
            <PurchaseItems
              items={items}
              disabled={busy}
              onQuantity={(id, quantity) =>
                cart.change({ type: 'quantity', id, quantity })
              }
              onRemove={(id) => cart.change({ type: 'remove', id })}
            />
          )}
        </section>
        <aside className="min-w-0 max-tablet:-mx-[var(--page-gutter)] max-tablet:rounded-t-[32px] max-tablet:bg-[image:var(--gradient-surface)] max-tablet:p-6">
          <OrderSummary
            totals={quote.query.data?.totals}
            loading={loading || busy || quote.query.isFetching}
            coupon
          >
            {needsRecalculation && (
              <div
                className={`mt-4 space-y-2 text-sm ${quote.query.isError ? 'text-destructive' : 'text-primary'}`}
                role={quote.query.isError ? 'alert' : 'status'}
              >
                {quote.query.isError && <p>{t(quoteError)}</p>}
                {quote.expired && <p>{t('quoteExpired')}</p>}
                <Button
                  variant="outline"
                  disabled={busy || quote.query.isFetching}
                  onClick={() => void quote.query.refetch()}
                >
                  {t('recalculate')}
                </Button>
              </div>
            )}
            {needsReview && !needsRecalculation && (
              <div
                className="mt-4 space-y-2 text-sm text-primary"
                role="status"
              >
                <p>{t('quoteChanged')}</p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => cart.setReviewedId(quote.query.data!.id)}
                >
                  {t('reviewedValues')}
                </Button>
              </div>
            )}
            {!quote.expired && (
              <p
                className={`mt-3 text-xs text-secondary ${quote.query.data ? '' : 'invisible'}`}
                aria-hidden={!quote.query.data}
              >
                {t('quoteValidity')}
              </p>
            )}
            <Button
              disabled={Boolean(unavailable)}
              asChild={!unavailable}
              className="mt-7 w-full max-tablet:min-h-15 max-tablet:rounded-full max-tablet:bg-[image:var(--gradient-copper)]"
            >
              {unavailable ? (
                <span>{t('checkout')}</span>
              ) : (
                <Link to="/checkout">{t('checkout')}</Link>
              )}
            </Button>
            <Link
              to="/"
              className="mt-3 block min-h-11 content-center text-center text-sm hover:text-primary"
            >
              {t('continue')}
            </Link>
          </OrderSummary>
        </aside>
      </div>
    )
  }
  return (
    <section className="min-w-0">
      <PurchaseHeader />
      {data?.mergeNotice !== 'none' && data?.mergeNotice && (
        <p
          role="status"
          className="mb-5 rounded-md border border-border bg-surface p-4 text-sm text-primary"
        >
          {t(data.mergeNotice === 'partial' ? 'mergePartial' : 'mergeDone')}
        </p>
      )}
      {writeFailed && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {t('cartWriteError')}
        </p>
      )}
      {cart.query.isError && data && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {t('loadError')}{' '}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={onRetry}
          >
            {t('retry')}
          </button>
        </p>
      )}
      {invalidStock && (
        <p
          role="alert"
          className="mb-5 rounded-md border border-destructive p-4 text-sm text-destructive"
        >
          {t('stockChanged')}
        </p>
      )}
      {renderCartContent()}
      <section className="mt-20 min-w-0" aria-label={t('related')}>
        <h2 className="mb-8 text-xl font-bold">{t('related')}</h2>
        <div className="grid auto-cols-[minmax(160px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4 desktop:grid-flow-row desktop:grid-cols-5 desktop:overflow-visible">
          {related.map((nft) => (
            <NftCard
              key={nft.id}
              nft={{ ...nft, imageAlt: card(nft.imageAltKey) }}
              compact
            />
          ))}
        </div>
      </section>
    </section>
  )
}
