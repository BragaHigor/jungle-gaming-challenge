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
  const { status, order, reset, emit, connected, lastEvent, invalidEvents } =
    useDemo()
  const [selection, setSelection] = useState<Scenario | null>(null)
  const { pathname } = useLocation()
  const isCatalogRoute = pathname === '/' || pathname.startsWith('/nfts/')
  const excludedScenario = pathname === '/' ? 'sold-out' : 'empty'
  const catalogScenarios = scenarios.filter(
    (scenario) => scenario !== excludedScenario,
  )
  const visibleScenarios = isCatalogRoute
    ? catalogScenarios
    : (['default'] as const)
  const candidate = selection ?? status.data?.scenario ?? 'default'
  const selected = visibleScenarios.some((scenario) => scenario === candidate)
    ? candidate
    : 'default'
  const error = status.error ?? order.error ?? reset.error ?? emit.error
  const contractError = error instanceof ApiError && error.code === 'CONTRACT'
  const errorText = contractError ? t('contractError') : t('requestError')
  const pending = reset.isPending || emit.isPending
  const lastLabel = lastEvent === 'nft.updated' ? t('catalog') : t('order')
  return (
    <div className="space-y-5">
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
      {order.data && (
        <section
          aria-label={t('order')}
          className="space-y-2 rounded-md border border-input p-4"
        >
          <p>{t('pending')}</p>
          <p className="text-xs text-secondary">
            {t('version', { version: order.data.version })}
          </p>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending || !connected || !isCatalogRoute}
          onClick={() => emit.mutate('nft.updated')}
        >
          {t('changeNft')}
        </Button>
        <Button
          variant="outline"
          disabled={pending || !connected || !order.data}
          onClick={() => emit.mutate('order.updated')}
        >
          {t('changeOrder')}
        </Button>
      </div>
      {lastEvent && (
        <p role="status" className="text-sm">
          {t('lastEvent', { resource: lastLabel })}
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
