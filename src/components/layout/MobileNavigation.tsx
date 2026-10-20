import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { UnavailableAction } from '@/components/UnavailableAction'
import { Icon } from '@/components/ui/Icon'

export function MobileNavigation() {
  const { t } = useTranslation('navigation')
  return (
    <nav aria-label={t('mobile')} className="mobile-navigation">
      <Link
        to="/"
        activeOptions={{ exact: true }}
        activeProps={{ 'aria-current': 'page' }}
        aria-label={t('home')}
      >
        <Icon name="home" />
      </Link>
      <UnavailableAction aria-label={t('favorites')}>
        <Icon name="heart" />
      </UnavailableAction>
      <UnavailableAction
        className="mobile-navigation__scan"
        aria-label={t('scan')}
      >
        <Icon name="scan" />
      </UnavailableAction>
      <Link to="/cart" aria-label={t('cart')}>
        <Icon name="cart" />
      </Link>
      <Link to="/profile" aria-label={t('account')}>
        <Icon name="user" />
      </Link>
    </nav>
  )
}
