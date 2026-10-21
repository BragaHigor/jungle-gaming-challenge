import { useTranslation } from 'react-i18next'
import type { OrderSnapshot } from '../../types/purchase'
import { ethToWei, weiToEth } from '../../utils/eth'

const statusPresentation = {
  confirmed: { path: 'm29 56 8 7 15-16', note: 'referenceNote' },
  pending: { path: 'M40 51v7l6 3', note: 'pendingNote' },
  declined: { path: 'm33 52 14 12m0-12L33 64', note: 'declinedNote' },
} as const

export function OrderResult({
  order,
  onContinue,
  onRetry,
  onViewReference,
}: {
  order: OrderSnapshot
  onContinue?: () => void
  onRetry?: () => void
  onViewReference?: () => void
}) {
  const { t, i18n } = useTranslation('purchase')
  const { t: card } = useTranslation('card')
  const presentation = statusPresentation[order.status]
  return (
    <article
      className="mx-auto w-full max-w-[578px] overflow-hidden rounded-lg border-b-8 border-primary bg-surface"
      aria-label={t('orderDetails')}
    >
      <header className="border-b border-primary px-6 py-6 text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 80 80"
          className="mx-auto mb-4 size-20 fill-none stroke-primary"
          strokeWidth="2"
        >
          <rect x="12" y="25" width="56" height="42" rx="4" />
          <path d="m12 28 28 20 28-20M24 14h32M29 7h22" />
          {<path d={presentation.path} />}
        </svg>
        <h1 className="text-base font-bold text-secondary" aria-live="polite">
          {t(order.status)}
        </h1>
      </header>
      <dl className="grid grid-cols-2 gap-4 border-b border-primary px-6 py-4 text-xs tablet:grid-cols-4">
        {[
          { label: t('orderId'), value: order.id },
          {
            label: t('date'),
            value: new Intl.DateTimeFormat(i18n.language, {
              timeZone: 'UTC',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(new Date(order.date)),
          },
          { label: t('total'), value: `${order.totals.total} ETH` },
          { label: t('walletType'), value: order.wallet },
        ].map((fact) => (
          <div key={fact.label} className="min-w-0 wrap-anywhere">
            <dt className="mb-1 text-secondary">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-6 px-5 py-7 tablet:px-11">
        <h2 className="text-sm font-bold">{t('orderDetails')}</h2>
        <ul className="space-y-3">
          {order.items.map(({ nft, quantity }) => (
            <li key={nft.id} className="flex items-center gap-3">
              <img
                src={nft.image}
                alt={card(nft.imageAltKey)}
                className="size-16 shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1 text-xs wrap-anywhere">
                <strong className="block">{nft.title}</strong>
                <span className="text-secondary">
                  {t('token', { token: nft.token })} · ×{quantity}
                </span>
              </div>
              <strong className="text-xs text-primary">
                {weiToEth(ethToWei(nft.price) * BigInt(quantity))} ETH
              </strong>
            </li>
          ))}
        </ul>
        <dl className="space-y-4 border-y border-primary py-5 text-sm">
          {(['subtotal', 'discount', 'fee', 'total'] as const).map((key) => (
            <div key={key} className="flex justify-between gap-3">
              <dt>{t(key)}</dt>
              <dd className={key === 'total' ? 'font-bold text-primary' : ''}>
                {order.totals[key]} ETH
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-relaxed text-secondary">
          {t(presentation.note)}
        </p>
        {order.status === 'confirmed' && (
          <p className="text-xs wrap-anywhere">
            <span className="text-secondary">{t('reference')}: </span>
            {order.reference}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {order.status === 'confirmed' && (
            <button
              type="button"
              disabled={!onViewReference}
              onClick={onViewReference}
              className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {t('viewReference')}
            </button>
          )}
          {order.status === 'declined' && (
            <button
              type="button"
              disabled={!onRetry}
              onClick={onRetry}
              className="min-h-11 rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {t('retry')}
            </button>
          )}
          <button
            type="button"
            disabled={!onContinue}
            onClick={onContinue}
            className="min-h-11 rounded-md border border-primary px-4 py-2 text-sm text-primary disabled:opacity-50"
          >
            {t('continue')}
          </button>
        </div>
      </div>
    </article>
  )
}
