import { cn } from '@/utils/cn'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/components/shared/LanguageSelect'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { Button } from '@/components/ui/button'
import { NavigationMenu } from '@/components/layout/NavigationMenu'
import { SearchDialog } from '@/components/catalog/SearchDialog'
import { Icon } from '@/components/ui/Icon'

export function Header() {
  const { t } = useTranslation('navigation')
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
      <div
        className={cn(
          "page-container w-full max-w-[calc(var(--content-width)_+_var(--page-gutter)_*_2)] ml-auto mr-auto pl-[var(--page-gutter)] pr-[var(--page-gutter)] site-header__row relative grid grid-cols-[1fr_auto_1fr] gap-4 items-center min-h-[2.8125rem] after:content-[''] after:absolute after:bottom-0 after:right-[var(--page-gutter)] after:left-[var(--page-gutter)] after:h-px after:bg-primary after:opacity-50 max-desktop:grid-cols-[1fr_auto] max-desktop:min-h-15 max-tablet:grid-cols-[1fr_auto]",
          marketActive && 'after:hidden',
        )}
      >
        <Link
          to="/"
          className="brand text-foreground text-[0.875rem] font-bold tracking-[0.1em] hover:text-primary-hover"
          aria-label={`KURIO — ${t('home')}`}
        >
          KURIO
        </Link>
        <nav
          className="desktop-navigation flex items-center gap-2 max-desktop:hidden"
          aria-label={t('main')}
        >
          <Link
            to="/"
            className={`nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold ${homeActive ? 'is-active' : ''}`}
            aria-current={homeActive ? 'page' : undefined}
          >
            {t('home')}
          </Link>
          <Link
            to="/"
            hash="marketplace"
            className={`nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold ${marketActive ? 'is-active' : ''}`}
            aria-current={marketActive ? 'page' : undefined}
          >
            {t('market')}
          </Link>
          <UnavailableAction className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold">
            {t('creators')}
          </UnavailableAction>
          <UnavailableAction className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold">
            {t('learn')}
          </UnavailableAction>
        </nav>
        <div className="site-header__actions flex items-center gap-2 justify-self-end">
          <div className="desktop-language max-desktop:hidden">
            <LanguageSelect compact />
          </div>
          <SearchDialog />
          <Link
            to="/cart"
            className="icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55 header-cart max-tablet:hidden"
            aria-label={t('cart')}
          >
            <Icon name="cart" />
          </Link>
          <Button
            asChild
            className="header-login max-desktop:hidden min-h-9 px-3 font-medium"
          >
            <Link to="/login">
              <Icon name="login" className="size-5" />
              {t('signIn')}
            </Link>
          </Button>
          <NavigationMenu className="icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55 mobile-menu-trigger desktop:hidden max-desktop:inline-grid" />
        </div>
      </div>
    </header>
  )
}
