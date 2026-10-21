import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCheckoutOrder } from '@/hooks/useCheckoutOrder'
import { Button } from '@/components/ui/button'
export function OrderRecovery() {
  const { t } = useTranslation('purchase')
  const order = useCheckoutOrder()
  if (!order.attempt) return null
  return (
    <section
      className="mb-6 space-y-3 rounded-lg border border-border bg-surface p-4 text-sm"
      role="status"
    >
      <p>{t('recoverAttempt')}</p>
      <Button disabled={order.submission.isPending} onClick={order.recover}>
        {t('recoverOrder')}
      </Button>
      <Button asChild variant="outline">
        <Link to="/confirmation" search={{ orderId: undefined }}>
          {t('checkOrders')}
        </Link>
      </Button>
      {order.submission.isError && <p role="alert">{t('uncertainOrder')}</p>}
    </section>
  )
}
