import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LanguageSelect } from '@/components/shared/LanguageSelect'

export function ConfirmationPage() {
  const { t } = useTranslation('purchase')
  return (
    <section className="mx-auto max-w-lg rounded-lg border border-border bg-surface px-6 py-14 text-center">
      <div className="mb-8 flex justify-center tablet:hidden">
        <LanguageSelect id="confirmation-language" />
      </div>
      <h1 className="mb-4 text-xl font-bold">{t('noOrder')}</h1>
      <p className="mb-8 text-sm leading-relaxed text-secondary">
        {t('noOrderDescription')}
      </p>
      <Button asChild>
        <Link to="/">{t('continue')}</Link>
      </Button>
    </section>
  )
}
