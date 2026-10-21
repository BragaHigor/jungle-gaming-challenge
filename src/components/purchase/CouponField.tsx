import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCart } from '@/hooks/useCart'
import { ApiError } from '@/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function CouponField({
  compact,
  disabled,
}: {
  compact: boolean
  disabled: boolean
}) {
  const { t } = useTranslation('purchase')
  const cart = useCart()
  const id = useId()
  const [code, setCode] = useState('')
  const [empty, setEmpty] = useState(false)
  const applied = cart.query.data?.coupon
  const action = cart.mutation.variables?.action.type
  const failed =
    cart.mutation.isError && (action === 'coupon' || action === 'removeCoupon')
  let error:
    | 'couponRequired'
    | 'couponInvalid'
    | 'couponExpired'
    | 'cartWriteError'
    | null = null
  if (empty) error = 'couponRequired'
  if (failed) error = 'cartWriteError'
  if (failed && cart.mutation.error instanceof ApiError) {
    if (cart.mutation.error.code === 'COUPON_INVALID') error = 'couponInvalid'
    if (cart.mutation.error.code === 'COUPON_EXPIRED') error = 'couponExpired'
  }
  const busy = disabled || cart.mutation.isPending || !cart.query.data
  return (
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
      <label htmlFor={id} className="mb-2 block text-sm max-tablet:sr-only">
        {t('coupon')}
      </label>
      <div className="flex min-w-0 max-tablet:rounded-full max-tablet:border max-tablet:border-border max-tablet:p-1">
        <Input
          id={id}
          maxLength={40}
          value={code}
          placeholder={t('couponPlaceholder')}
          disabled={busy}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 rounded-r-none text-xs max-tablet:rounded-full max-tablet:border-0"
          onChange={(event) => {
            setCode(event.target.value)
            setEmpty(false)
            if (failed) cart.mutation.reset()
          }}
        />
        <Button
          type="button"
          disabled={busy}
          className="rounded-l-none px-4 max-tablet:rounded-full max-tablet:bg-[image:var(--gradient-copper)]"
          onClick={() => {
            if (!code.trim()) {
              setEmpty(true)
              return
            }
            cart.change({ type: 'coupon', code }, () => setCode(''))
          }}
        >
          {t('apply')}
        </Button>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-xs text-destructive"
        >
          {t(error)}
        </p>
      )}
      {applied && (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-primary"
          role="status"
        >
          <span>{t('couponApplied', { code: applied })}</span>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 underline disabled:opacity-55"
            onClick={() => cart.change({ type: 'removeCoupon' })}
          >
            {t('removeCoupon')}
          </button>
        </div>
      )}
    </details>
  )
}
