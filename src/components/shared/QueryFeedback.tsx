import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'

export function QueryFeedback({
  query,
  resource = 'catalog',
}: {
  resource?: 'catalog' | 'account'
  query: {
    data: unknown
    error: Error | null
    isFetching: boolean
    refetch: () => unknown
  }
}) {
  const { t } = useTranslation(resource)
  if (query.error && !query.data) {
    const contract =
      query.error instanceof ApiError && query.error.code === 'CONTRACT'
    return (
      <p className="sr-only" role="alert">
        {t(contract ? 'contractError' : 'requestError')}
      </p>
    )
  }
  if (!query.data) return null
  if (query.error)
    return (
      <div className="my-3 flex flex-wrap items-center gap-3" role="alert">
        <p>{t('refreshError')}</p>
        <Button
          variant="outline"
          onClick={() => {
            query.refetch()
          }}
        >
          {t('retry')}
        </Button>
      </div>
    )
  if (query.isFetching)
    return (
      <p
        role="status"
        className="pointer-events-none fixed top-4 right-4 z-60 rounded-md border border-border bg-surface px-3 py-2 text-xs text-secondary"
      >
        {t('refreshing')}
      </p>
    )
  return null
}
