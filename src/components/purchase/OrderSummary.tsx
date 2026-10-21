import type { ReactNode } from 'react'
import { CouponField } from './CouponField'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseTotals } from '@/types/purchase'

export function OrderSummary({
  totals,
  loading = false,
  children,
  coupon = false,
  compact = false,
}: {
  totals?: PurchaseTotals
  loading?: boolean
  children?: ReactNode
  coupon?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation('purchase')
  return (
    <section aria-label={t('summary')} aria-busy={loading} className="min-w-0">
      {coupon && <CouponField compact={compact} disabled={loading} />}
      <dl
        className={
          compact ? 'mt-3 space-y-2 text-sm' : 'mt-5 space-y-4 text-sm'
        }
        aria-live="polite"
      >
        {(['subtotal', 'discount', 'fee', 'total'] as const).map((key) => {
          const valueClassName =
            key === 'total'
              ? 'block min-h-7 max-w-full wrap-anywhere text-lg font-bold text-primary'
              : 'block min-h-7 max-w-full wrap-anywhere'
          const discountPrefix = key === 'discount' ? '− ' : ''
          const amount = loading ? (
            <Skeleton className="ml-auto h-7 w-28 max-w-full" />
          ) : (
            <span className={valueClassName}>
              {discountPrefix}
              {totals ? `${totals[key]} ETH` : '—'}
            </span>
          )
          return (
            <div
              key={key}
              className={`flex min-h-7 items-start justify-between gap-3 ${key === 'total' ? 'pt-4 font-bold' : ''}`}
            >
              <dt>{t(key)}</dt>
              <dd className="min-w-0 text-right tabular-nums">
                {amount}
                {key === 'fee' && (
                  <small className="mt-1 block text-xs text-secondary">
                    {t('feeEstimate')}
                  </small>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      {children}
    </section>
  )
}
