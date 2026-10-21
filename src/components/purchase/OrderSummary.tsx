import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { PurchaseTotals } from '@/types/purchase'

export function OrderSummary({
  totals,
  loading = false,
  children,
  coupon = false,
  compact = false,
}: {
  totals: PurchaseTotals
  loading?: boolean
  children?: ReactNode
  coupon?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation('purchase')
  const couponId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  return (
    <section aria-label={t('summary')} aria-busy={loading} className="min-w-0">
      {coupon && (
        <Dialog open={open} onOpenChange={setOpen}>
          <details open={!compact}>
            <summary
              className={
                compact
                  ? 'min-h-11 cursor-pointer content-center text-center text-xs text-secondary'
                  : 'hidden'
              }
            >
              {t('showCoupon')}
            </summary>
            {!compact && (
              <h2 className="mb-6 border-b border-primary pb-3 font-bold max-tablet:sr-only">
                {t('summary')}
              </h2>
            )}
            <label
              htmlFor={couponId}
              className="mb-2 block text-sm max-tablet:sr-only"
            >
              {t('coupon')}
            </label>
            <div className="flex min-w-0 max-tablet:rounded-full max-tablet:border max-tablet:border-border max-tablet:p-1">
              <Input
                id={couponId}
                maxLength={40}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError(false)
                }}
                placeholder={t('couponPlaceholder')}
                aria-invalid={error}
                aria-describedby={error ? `${couponId}-error` : undefined}
                disabled={loading}
                className="min-w-0 flex-1 rounded-r-none text-xs max-tablet:rounded-full max-tablet:border-0"
              />
              <DialogTrigger asChild>
                <Button
                  type="button"
                  disabled={loading}
                  className="rounded-l-none px-4 max-tablet:rounded-full max-tablet:bg-[image:var(--gradient-copper)]"
                  onClick={(event) => {
                    if (!code.trim()) {
                      event.preventDefault()
                      setError(true)
                    }
                  }}
                >
                  {t('apply')}
                </Button>
              </DialogTrigger>
            </div>
            <p
              id={`${couponId}-error`}
              role="status"
              className="mt-2 text-xs text-destructive"
            >
              {error ? t('couponRequired') : ''}
            </p>
          </details>
          <DialogContent
            title={t('coupon')}
            description={t('couponUnavailable')}
          />
        </Dialog>
      )}
      <dl
        className={
          compact ? 'mt-3 space-y-2 text-sm' : 'mt-5 space-y-4 text-sm'
        }
        aria-live="polite"
      >
        {(['subtotal', 'discount', 'fee', 'total'] as const).map((key) => {
          const valueClassName =
            key === 'total'
              ? 'inline-block min-h-7 text-lg font-bold text-primary'
              : 'inline-block min-h-7'
          const discountPrefix = key === 'discount' ? '− ' : ''
          const amount = loading ? (
            <Skeleton className="ml-auto h-7 w-28" />
          ) : (
            <span className={valueClassName}>
              {discountPrefix}
              {totals[key]} ETH
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
