import { useState } from 'react'
import { useOrder } from '@/hooks/useOrder'
import { OrderResult } from '@/components/purchase/OrderResult'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LanguageSelect } from '@/components/shared/LanguageSelect'

function ConfirmationContent() {
  const { t } = useTranslation('purchase')
  const { orderId } = useSearch({ from: '/confirmation' })
  const { query, orders } = useOrder(orderId)
  const navigate = useNavigate()
  const [referenceOpen, setReferenceOpen] = useState(false)
  const order = query.data
  const error = query.error ?? orders.error
  if (error)
    return (
      <section role="alert" className="mx-auto max-w-lg space-y-5 p-6">
        <h1>{t('orderReadError')}</h1>
        <Button
          onClick={() => {
            if (query.error) void query.refetch()
            else void orders.refetch()
          }}
        >
          {t('retry')}
        </Button>
        <Button asChild variant="outline">
          <Link to="/cart">{t('backToCart')}</Link>
        </Button>
      </section>
    )
  if (order)
    return (
      <>
        <OrderResult
          order={{
            id: order.id,
            status: order.status,
            date: order.createdAt,
            wallet: `${order.walletProvider || order.walletId} · ${order.network}`,
            reference: order.reference ?? '',
            totals: order.totals,
            items: order.items.map((item) => ({
              nft: { ...item.nft, price: item.unitPrice },
              editionId: item.editionId,
              quantity: item.quantity,
              available: item.quantity,
            })),
          }}
          onContinue={() => void navigate({ to: '/' })}
          onRetry={
            order.status === 'declined'
              ? () => void navigate({ to: '/checkout' })
              : undefined
          }
          onViewReference={
            order.status === 'confirmed'
              ? () => setReferenceOpen(true)
              : undefined
          }
        />
        <Dialog open={referenceOpen} onOpenChange={setReferenceOpen}>
          <DialogContent
            title={t('reference')}
            description={t('referenceNote')}
          >
            <p className="text-sm wrap-anywhere">{order.reference}</p>
            <p className="text-sm wrap-anywhere">{order.walletAddress}</p>
          </DialogContent>
        </Dialog>
      </>
    )
  if (
    orders.isLoading ||
    (orderId && query.isLoading) ||
    (orders.data?.length && query.isLoading)
  )
    return (
      <section
        aria-label={t('loadingOrder')}
        aria-busy="true"
        className="mx-auto max-w-lg space-y-5 p-6"
      >
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    )
  return (
    <section className="mx-auto max-w-lg rounded-lg border border-border bg-surface px-6 py-14 text-center">
      <h1 className="mb-4 text-xl font-bold">{t('noOrder')}</h1>
      <p className="mb-8 text-sm leading-relaxed text-secondary">
        {t('noOrderDescription')}
      </p>
      <Button asChild>
        <Link to="/">{t('continue')}</Link>
      </Button>
    </section>
  )
}

export function ConfirmationPage() {
  return (
    <>
      <div className="mx-auto mb-5 flex max-w-lg justify-center tablet:hidden">
        <LanguageSelect id="confirmation-language" />
      </div>
      <ConfirmationContent />
    </>
  )
}
