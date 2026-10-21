import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { AccountViewState } from '@/schemas/account'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function AccountState({
  state,
  onRetry,
}: {
  state: Exclude<AccountViewState, 'ready'>
  onRetry: () => void
}) {
  const { t } = useTranslation('account')
  if (state === 'loading')
    return (
      <div
        aria-busy="true"
        aria-label={t('loading')}
        className="mt-8 grid gap-7 tablet:grid-cols-2"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    )
  if (state === 'error')
    return (
      <div role="status" className="mt-8 rounded-lg border border-border p-6">
        <p className="mb-5">{t('loadError')}</p>
        <Button onClick={onRetry}>{t('retry')}</Button>
      </div>
    )
  const message = state === 'expired' ? 'expired' : 'signedOut'
  return (
    <div role="status" className="mt-8 rounded-lg border border-border p-6">
      <h2 className="mb-3 text-lg font-bold">{t(message)}</h2>
      <p className="mb-5 text-secondary">{t('signInToContinue')}</p>
      <Button asChild>
        <Link to="/login">{t('login')}</Link>
      </Button>
    </div>
  )
}
