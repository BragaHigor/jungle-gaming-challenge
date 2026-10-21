import { useEffect } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileNavigation } from '@/components/layout/MobileNavigation'

const pageClasses = {
  home: 'site-layout--home max-tablet:[&>.site-header]:hidden',
  nft: 'site-layout--nft max-tablet:[&>.site-header]:hidden max-tablet:[&>.mobile-navigation]:hidden max-tablet:pb-[calc(200px_+_env(safe-area-inset-bottom))] max-tablet:[@media(max-height:500px)]:pb-0 max-tablet:[&_.page-content]:mt-0',
  purchase:
    'max-tablet:[&>.site-header]:hidden max-tablet:[&>.mobile-navigation]:hidden max-tablet:pb-0 max-tablet:[&_.page-content]:mt-4',
}

const getPageClass = (pathname: string) => {
  if (pathname === '/') return pageClasses.home
  if (pathname.startsWith('/nfts/')) return pageClasses.nft
  if (['/cart', '/checkout', '/confirmation'].includes(pathname))
    return pageClasses.purchase
  return ''
}

export function App() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const pageClass = getPageClass(pathname)

  useEffect(() => {
    document.title = t('pageTitle')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('pageDescription'))
  }, [t])

  return (
    <div
      className={`site-layout pt-6 max-tablet:pt-2 max-tablet:pb-[calc(7rem_+_env(safe-area-inset-bottom))] ${pageClass}`}
    >
      <a
        href="#content"
        className="skip-link fixed top-2 left-2 z-100 pt-3 pr-4 pb-3 pl-4 rounded-md bg-primary text-background [transform:translateY(-200%)] focus:[transform:translateY(0)]"
      >
        {t('skipToContent')}
      </a>
      <Header />
      <main
        id="content"
        tabIndex={-1}
        className="page-container w-full max-w-[calc(var(--content-width)_+_var(--page-gutter)_*_2)] ml-auto mr-auto pl-[var(--page-gutter)] pr-[var(--page-gutter)] page-content mt-8"
      >
        <Outlet />
      </main>
      <Footer />
      <MobileNavigation />
    </div>
  )
}
