import type { Scenario } from '@/schemas/demo'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useDemo } from '@/hooks/useDemo'
import { mocksEnabled } from '@/constants/environment'
import { demoDestination, isDemoDestination } from '@/constants/demo'
import { runGuidedAction } from '@/api/demo'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'

const expectedFailureStatus: Partial<Record<Scenario, number>> = {
  'coupon-invalid': 422,
  'coupon-expired': 422,
  'favorites-failure': 503,
  'account-write-failure': 503,
  'account-validation': 422,
  'connection-refused': 409,
}

const actionScenarios = [
  'coupon-invalid',
  'coupon-expired',
  'favorites-failure',
  'account-write-failure',
  'account-validation',
  'connection-refused',
  'malformed-event',
]

function ActiveDemoBanner() {
  const { t } = useTranslation('demo')
  const { guided, exit, start, invalidEvents, connected } = useDemo()
  const { href } = useLocation()
  const navigate = useNavigate()
  const scenario = guided?.scenario ?? 'default'
  const destination = demoDestination(scenario)
  const onTarget = isDemoDestination(href, scenario)
  const action = useQuery({
    queryKey: ['guided-action', guided?.generation, scenario],
    queryFn: ({ signal }) => runGuidedAction(scenario, signal),
    enabled: Boolean(
      guided &&
      onTarget &&
      actionScenarios.includes(scenario) &&
      (scenario !== 'malformed-event' || connected),
    ),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
  if (!guided) return null
  const actionError = action.error instanceof ApiError ? action.error : null
  const expectedFailure = Boolean(
    actionError &&
    expectedFailureStatus[scenario] !== undefined &&
    actionError.status === expectedFailureStatus[scenario],
  )
  const failureMessage = expectedFailure
    ? t('actionFailure', { code: actionError?.status })
    : t('requestError')
  return (
    <section
      aria-label={t('activeTitle')}
      className="mx-auto mb-5 w-full max-w-[var(--content-width)] space-y-3 rounded-md border border-primary bg-surface px-4 py-4 text-sm"
    >
      <p className="font-bold text-primary">
        {t('activeTitle')}: {t(`scenario_${scenario}`)}
      </p>
      <p className="text-xs leading-relaxed text-secondary">
        {t('activeNotice')}
      </p>
      <p className="text-xs leading-relaxed">{t(`effect_${scenario}`)}</p>
      {action.isFetching && <p role="status">{t('runningAction')}</p>}
      {action.isError && (
        <p role="status" className="text-xs text-primary">
          {failureMessage}
        </p>
      )}
      {invalidEvents > 0 && (
        <p role="status" className="text-xs">
          {t('invalidEvent', { count: invalidEvents })}
        </p>
      )}
      {action.isSuccess && (
        <p role="status" className="text-xs">
          {t('actionComplete')}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {!onTarget && (
          <Button
            variant="outline"
            disabled={exit.isPending || start.isPending}
            onClick={() => void navigate({ href: destination })}
          >
            {t('returnToDemo')}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={exit.isPending || start.isPending}
          onClick={() => exit.mutate()}
        >
          {t(exit.isPending ? 'restoring' : 'exitDemo')}
        </Button>
      </div>
      {exit.error && (
        <p role="alert" className="text-destructive">
          {t('requestError')}
        </p>
      )}
    </section>
  )
}

export function DemoBanner() {
  if (!mocksEnabled) return null
  return <ActiveDemoBanner />
}
