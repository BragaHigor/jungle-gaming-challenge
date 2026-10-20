import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileNavigation } from '@/components/layout/MobileNavigation'

export function App() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('pageTitle')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('pageDescription'))
  }, [t])

  return (
    <div className="site-layout">
      <a href="#content" className="skip-link">
        {t('skipToContent')}
      </a>
      <Header />
      <main id="content" tabIndex={-1} className="page-container page-content">
        <Outlet />
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  )
}
