import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function SessionError() {
  const router = useRouter()
  const { t } = useTranslation('account')
  return (
    <section className="mx-auto my-12 max-w-lg space-y-5 rounded-lg border border-border bg-surface p-6">
      <p role="alert">{t('sessionError')}</p>
      <Button onClick={() => void router.invalidate()}>{t('retry')}</Button>
    </section>
  )
}
