import { FavoritesDialog } from '@/components/account/FavoritesDialog'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { NavigationMenu } from '@/components/layout/NavigationMenu'
import { Icon } from '@/components/ui/Icon'

export function MobileNavigation() {
  const { t } = useTranslation('navigation')
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={t('mobile')}
      className="mobile-navigation hidden max-tablet:fixed max-tablet:bottom-0 max-tablet:left-0 max-tablet:right-0 max-tablet:z-50 max-tablet:grid max-tablet:grid-cols-5 max-tablet:items-center max-tablet:h-[calc(6rem_+_env(safe-area-inset-bottom))] max-tablet:pt-0 max-tablet:pr-3 max-tablet:pb-[env(safe-area-inset-bottom)] max-tablet:pl-3 max-tablet:[border-radius:2rem_2rem_0_0] max-tablet:bg-surface max-tablet:text-secondary max-tablet:[&_[aria-current='page']]:text-primary tablet:[&_.bottom-menu-trigger]:hidden"
    >
      <Link
        className="max-tablet:grid max-tablet:place-items-center max-tablet:min-h-14"
        to="/"
        activeOptions={{ exact: true }}
        activeProps={{ 'aria-current': 'page' }}
        aria-label={t('home')}
      >
        <Icon name="home" />
      </Link>
      <FavoritesDialog
        className="max-tablet:grid max-tablet:place-items-center max-tablet:min-h-14"
        label={t('favorites')}
      >
        <Icon name="heart" />
      </FavoritesDialog>
      <UnavailableAction
        className="mobile-navigation__scan max-tablet:justify-self-center max-tablet:relative max-tablet:-top-6 max-tablet:w-18 max-tablet:h-18 max-tablet:border-[0.375rem] max-tablet:border-background max-tablet:rounded-full max-tablet:[background:var(--gradient-copper)] max-tablet:text-primary-foreground max-tablet:grid max-tablet:place-items-center max-tablet:min-h-14"
        aria-label={t('scan')}
      >
        <Icon name="scan" />
      </UnavailableAction>
      <Link
        className="max-tablet:grid max-tablet:place-items-center max-tablet:min-h-14"
        to="/cart"
        aria-label={t('cart')}
      >
        <Icon name="cart" />
      </Link>
      {pathname === '/' ? (
        <NavigationMenu
          icon="user"
          className="bottom-menu-trigger grid min-h-14 place-items-center"
        />
      ) : (
        <Link
          className="grid min-h-14 place-items-center"
          to="/profile"
          aria-label={t('account')}
        >
          <Icon name="user" />
        </Link>
      )}
    </nav>
  )
}
