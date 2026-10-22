import { useSession } from '@/hooks/useSession'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDemo } from '@/hooks/useDemo'
import { mocksEnabled } from '@/constants/environment'
import { scenarios, scenarioSchema, type Scenario } from '@/schemas/demo'
import { useLocation } from '@tanstack/react-router'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'

function DemoDashboard({ onApplied }: { onApplied: () => void }) {
  const { t } = useTranslation('demo')
  const { t: purchase } = useTranslation('purchase')
  const { session } = useSession()
  const {
    start,
    status,
    order,
    reset,
    emit,
    connection,
    connected,
    synchronizing,
    lastEvent,
    invalidEvents,
    ignoredEvents,
  } = useDemo()
  const [eventMode, setEventMode] = useState<
    | 'normal'
    | 'duplicate'
    | 'stale'
    | 'malformed'
    | 'foreign'
    | 'wrong-generation'
  >('normal')
  const [guidedSelection, setGuidedSelection] = useState<Scenario>('empty')
  const [selection, setSelection] = useState<Scenario | null>(null)
  const { pathname } = useLocation()
  const isCatalogRoute = pathname === '/' || pathname.startsWith('/nfts/')
  const cartScenarios = [
    'cart-empty',
    'coupon-invalid',
    'coupon-expired',
    'quote-failure',
    'cart-price-change',
    'cart-stock-change',
    'cart-ready',
    'cart-slow',
  ] as const
  const isCartScenario = (scenario: Scenario) =>
    cartScenarios.some((value) => value === scenario)
  const accountResourceScenarios = scenarios.filter((scenario) =>
    scenario.startsWith('account-'),
  )
  const excludedScenario = pathname === '/' ? 'sold-out' : 'empty'
  const privateScenarios = [
    'session-expired',
    'favorites-failure',
    'favorites-ready',
  ] as const
  const isPrivateScenario = (scenario: Scenario) =>
    privateScenarios.some((value) => value === scenario)
  const catalogScenarios = scenarios.filter(
    (scenario) =>
      scenario !== excludedScenario &&
      !isCartScenario(scenario) &&
      !scenario.startsWith('account-') &&
      !scenario.startsWith('order-') &&
      scenario !== 'connection-refused' &&
      (!isPrivateScenario(scenario) || session),
  )
  const accountScenarios = session
    ? (['default', ...privateScenarios] as const)
    : (['default'] as const)
  let visibleScenarios: readonly Scenario[] = accountScenarios
  if (isCatalogRoute) visibleScenarios = catalogScenarios
  if (session && (pathname === '/profile' || pathname === '/wallets'))
    visibleScenarios = [...accountScenarios, ...accountResourceScenarios]
  if (pathname === '/cart' || pathname === '/checkout')
    visibleScenarios = [...accountScenarios, ...cartScenarios]
  if (session && (pathname === '/checkout' || pathname === '/confirmation'))
    visibleScenarios = [
      ...visibleScenarios,
      'order-read-failure',
      'order-confirmed',
      'order-declined',
      'order-timeout',
      'order-pending',
      'connection-refused',
    ]
  const candidate = selection ?? status.data?.scenario ?? 'default'
  const selected = visibleScenarios.some((scenario) => scenario === candidate)
    ? candidate
    : 'default'
  const error =
    status.error ?? order.error ?? reset.error ?? emit.error ?? connection.error
  const contractError = error instanceof ApiError && error.code === 'CONTRACT'
  const errorText = contractError ? t('contractError') : t('requestError')
  const pending =
    start.isPending || reset.isPending || emit.isPending || connection.isPending
  const lastLabel = lastEvent === 'nft.updated' ? t('catalog') : t('order')
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-md border border-primary p-4">
        <h3 className="font-bold">{t('guidedTitle')}</h3>
        <p className="text-xs leading-relaxed text-secondary">
          {t('guidedNotice')}
        </p>
        <label className="grid gap-2 text-sm">
          {t('guidedScenario')}
          <Select
            value={guidedSelection}
            disabled={pending}
            onChange={(event) =>
              setGuidedSelection(scenarioSchema.parse(event.target.value))
            }
          >
            {scenarios.map((scenario) => (
              <option key={scenario} value={scenario}>
                {t(`scenario_${scenario}`)}
              </option>
            ))}
          </Select>
        </label>
        <p className="text-xs leading-relaxed text-secondary">
          {t(`effect_${guidedSelection}`)}
        </p>
        <Button
          disabled={pending}
          onClick={() =>
            start.mutate(guidedSelection, {
              onSuccess: onApplied,
            })
          }
        >
          {t(pending ? 'preparing' : 'guidedStart')}
        </Button>
        {start.error && (
          <p role="alert" className="text-sm text-destructive">
            {t('requestError')}
          </p>
        )}
      </section>
      <h3 className="font-bold">{t('advancedTitle')}</h3>
      <p className="text-xs leading-relaxed text-secondary">{t('notice')}</p>
      <label className="grid gap-2 text-sm">
        {t('scenario')}
        <Select
          value={selected}
          disabled={pending || !status.data}
          onChange={(event) =>
            setSelection(scenarioSchema.parse(event.target.value))
          }
        >
          {visibleScenarios.map((scenario) => (
            <option key={scenario} value={scenario}>
              {t(`scenario_${scenario}`)}
            </option>
          ))}
        </Select>
      </label>
      <p className="text-xs leading-relaxed text-secondary">
        {t(`effect_${selected}`)}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pending || !status.data}
          onClick={() => reset.mutate(selected, { onSuccess: onApplied })}
        >
          {t('apply')}
        </Button>
        <Button
          variant="outline"
          disabled={pending || !status.data}
          onClick={() => {
            setSelection('default')
            reset.mutate('default', { onSuccess: onApplied })
          }}
        >
          {t('reset')}
        </Button>
      </div>
      <p role="status" aria-live="polite">
        {connected ? t('connected') : t('disconnected')}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorText}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            connection.mutate(connected ? 'disconnect' : 'reconnect')
          }
        >
          {t(connected ? 'interruptConnection' : 'resumeConnection')}
        </Button>
      </div>
      {synchronizing && (
        <p role="status" className="text-sm">
          {t('reconciling')}
        </p>
      )}
      <label className="grid gap-2 text-sm">
        {t('eventMode')}
        <Select
          value={eventMode}
          onChange={(event) =>
            setEventMode(event.target.value as typeof eventMode)
          }
        >
          {(
            [
              'normal',
              'duplicate',
              'stale',
              'malformed',
              'foreign',
              'wrong-generation',
            ] as const
          ).map((mode) => (
            <option key={mode} value={mode}>
              {t(`eventMode_${mode}`)}
            </option>
          ))}
        </Select>
      </label>
      {order.data && (
        <section
          aria-label={t('order')}
          className="space-y-2 rounded-md border border-input p-4"
        >
          <p>{purchase(order.data.status)}</p>
          <p className="text-xs text-secondary">
            {t('version', { version: order.data.version })}
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={
            pending ||
            !connected ||
            (!isCatalogRoute &&
              pathname !== '/cart' &&
              pathname !== '/checkout')
          }
          onClick={() => emit.mutate({ type: 'nft.updated', mode: eventMode })}
        >
          {t('changeNft')}
        </Button>
        <Button
          variant="outline"
          disabled={
            pending ||
            !connected ||
            !order.data ||
            order.data.status !== 'pending'
          }
          onClick={() =>
            emit.mutate({
              type: 'order.updated',
              mode: eventMode,
              resourceId: order.data?.id,
            })
          }
        >
          {t('changeOrder')}
        </Button>
      </div>
      {order.data?.status === 'pending' && (
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={pending}
            onClick={() =>
              emit.mutate({
                type: 'order.updated',
                resourceId: order.data?.id,
                outcome: 'confirmed',
              })
            }
          >
            {t('confirmPayment')}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              emit.mutate({
                type: 'order.updated',
                resourceId: order.data?.id,
                outcome: 'declined',
              })
            }
          >
            {t('declinePayment')}
          </Button>
        </div>
      )}
      {lastEvent && (
        <p role="status" className="text-sm">
          {t('lastEvent', { resource: lastLabel })}
        </p>
      )}
      {ignoredEvents > 0 && (
        <p role="status" className="text-sm">
          {t('ignoredEvent', { count: ignoredEvents })}
        </p>
      )}
      {invalidEvents > 0 && (
        <p role="status" className="text-sm text-destructive">
          {t('invalidEvent', { count: invalidEvents })}
        </p>
      )}
    </div>
  )
}
export function DemoControls() {
  const { t } = useTranslation('demo')
  const [open, setOpen] = useState(false)
  if (!mocksEnabled) return null
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="min-h-11 px-2 text-xs">
          {t('open')}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('title')} description={t('description')}>
        {open && <DemoDashboard onApplied={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
