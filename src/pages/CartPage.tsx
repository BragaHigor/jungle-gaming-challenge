import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PurchaseHeader } from '@/components/purchase/PurchaseHeader'
import { PurchaseItems } from '@/components/purchase/PurchaseItems'
import { OrderSummary } from '@/components/purchase/OrderSummary'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard } from '@/components/catalog/NftCard'
import type { PurchaseItem } from '@/types/purchase'
import type { CatalogNft, ViewState } from '@/types/catalog'
import { presentationTotals } from '@/utils/purchase'

export function CartPage({
  initialItems,
  related,
  state = 'ready',
  onRetry,
}: {
  initialItems: readonly PurchaseItem[]
  related: readonly CatalogNft[]
  state?: ViewState
  onRetry: () => void
}) {
  const { t } = useTranslation('purchase')
  const { t: card } = useTranslation('card')
  const [items, setItems] = useState(state === 'empty' ? [] : [...initialItems])
  const loading = state === 'loading'
  const failure = state === 'error' || state === 'unavailable'
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
              onQuantity={(id, quantity) =>
                setItems((current) =>
                  current.map((item) =>
                    item.nft.id === id ? { ...item, quantity } : item,
                  ),
                )
              }
              onRemove={(id) =>
                setItems((current) =>
                  current.filter((item) => item.nft.id !== id),
                )
              }
            />
          )}
        </section>
        <aside className="max-tablet:-mx-[var(--page-gutter)] max-tablet:rounded-t-[32px] max-tablet:bg-[image:var(--gradient-surface)] max-tablet:p-6">
          <OrderSummary
            totals={presentationTotals(items)}
            loading={loading}
            coupon
          >
            <Button
              disabled={loading}
              asChild={!loading}
              className="mt-7 w-full max-tablet:min-h-15 max-tablet:rounded-full max-tablet:bg-[image:var(--gradient-copper)]"
            >
              {loading ? (
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
