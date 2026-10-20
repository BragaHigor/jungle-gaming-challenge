import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/components/LanguageSelect'
import { UnavailableAction } from '@/components/UnavailableAction'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/Icon'

export function Header() {
  const { t } = useTranslation('navigation')
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname, hash } = useLocation()
  const marketActive =
    pathname.startsWith('/nfts') ||
    ['/cart', '/checkout', '/confirmation'].includes(pathname) ||
    hash === 'marketplace'
  const homeActive = !marketActive

  return (
    <header
      className={`site-header ${marketActive ? 'site-header--plain' : ''}`}
    >
      <div className="page-container site-header__row">
        <Link to="/" className="brand" aria-label={`KURIO — ${t('home')}`}>
          KURIO
        </Link>
        <nav className="desktop-navigation" aria-label={t('main')}>
          <Link
            to="/"
            className={`nav-link ${homeActive ? 'is-active' : ''}`}
            aria-current={homeActive ? 'page' : undefined}
          >
            {t('home')}
          </Link>
          <Link
            to="/"
            hash="marketplace"
            className={`nav-link ${marketActive ? 'is-active' : ''}`}
            aria-current={marketActive ? 'page' : undefined}
          >
            {t('market')}
          </Link>
          <UnavailableAction className="nav-link">
            {t('creators')}
          </UnavailableAction>
          <UnavailableAction className="nav-link">
            {t('learn')}
          </UnavailableAction>
        </nav>
        <div className="site-header__actions">
          <div className="desktop-language">
            <LanguageSelect compact />
          </div>
          <UnavailableAction
            className="icon-button header-search"
            aria-label={t('search')}
          >
            <Icon name="search" />
          </UnavailableAction>
          <Link
            to="/cart"
            className="icon-button header-cart"
            aria-label={t('cart')}
          >
            <Icon name="cart" />
          </Link>
          <Button asChild className="header-login min-h-9 px-3 font-medium">
            <Link to="/login">
              <Icon name="login" className="size-5" />
              {t('signIn')}
            </Link>
          </Button>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <button
                className="icon-button mobile-menu-trigger"
                type="button"
                aria-label={t('menu')}
              >
                <Icon name="menu" />
              </button>
            </DialogTrigger>
            <DialogContent
              placement="right"
              title={t('menuTitle')}
              description={t('menuDescription')}
            >
              <nav aria-label={t('main')} className="drawer-navigation">
                <Link
                  to="/"
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('home')}
                </Link>
                <Link
                  to="/"
                  hash="marketplace"
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('market')}
                </Link>
                <UnavailableAction className="nav-link">
                  {t('creators')}
                </UnavailableAction>
                <UnavailableAction className="nav-link">
                  {t('learn')}
                </UnavailableAction>
                <Link
                  to="/login"
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('signIn')}
                </Link>
                <Link
                  to="/profile"
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('account')}
                </Link>
                <Link
                  to="/wallets"
                  className="nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('wallets')}
                </Link>
              </nav>
              <div className="mt-auto pt-6">
                <LanguageSelect id="menu-language" />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
