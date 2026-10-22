import { useTranslation } from 'react-i18next'
import { useRealtimeStatus } from '@/hooks/useDemo'
export function RealtimeFeedback() {
  const { t } = useTranslation('purchase')
  const { connectionKnown, connected, synchronizing } = useRealtimeStatus()
  if (!connectionKnown || (connected && !synchronizing)) return null
  return (
    <p
      role="status"
      className="pointer-events-none fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface px-4 py-3 text-xs text-secondary max-tablet:bottom-32 tablet:max-w-sm"
    >
      {t(connected ? 'updatingLive' : 'connectionInterrupted')}
    </p>
  )
}
