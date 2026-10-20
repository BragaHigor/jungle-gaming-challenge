import { useEffect } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/components/LanguageSelect'

export function App() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('pageTitle')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('pageDescription'))
  }, [t])

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">
      <a href="#content" className="sr-only focus:not-sr-only">
        {t('skipToContent')}
      </a>
      <header className="flex flex-wrap items-center justify-between gap-6">
        <Link
          to="/"
          className="text-2xl font-bold tracking-widest text-primary"
        >
          KURIO
        </Link>
        <LanguageSelect />
      </header>
      <main id="content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
