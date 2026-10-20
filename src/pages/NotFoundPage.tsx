import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">404 — {t('notFound')}</h1>
      <Link to="/" className="underline underline-offset-4">
        {t('home')}
      </Link>
    </section>
  )
}
