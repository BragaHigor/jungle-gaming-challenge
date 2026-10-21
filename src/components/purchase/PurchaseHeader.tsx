import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NavigationMenu } from '@/components/layout/NavigationMenu'
import { Icon } from '@/components/ui/Icon'

export function PurchaseHeader({ checkout = false }: { checkout?: boolean }) {
  const { t } = useTranslation('purchase')
  return (
    <>
      <div className="mb-8 flex items-center gap-3 tablet:hidden">
        <Link
          to={checkout ? '/cart' : '/'}
          aria-label={t('back')}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-primary"
        >
          <Icon name="back" />
        </Link>
        <h1 className="min-w-0 flex-1 text-center text-lg font-bold">
          {t(checkout ? 'checkoutTitle' : 'cartTitle')}
        </h1>
        <NavigationMenu className="grid size-11 shrink-0 place-items-center text-primary" />
      </div>
      <nav
        aria-label={t('breadcrumb')}
        className="mb-5 hidden items-center gap-2 text-xs text-secondary tablet:flex"
      >
        <Link className="min-h-11 content-center hover:text-primary" to="/">
          {t('home')}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          className="min-h-11 content-center hover:text-primary"
          to="/"
          hash="marketplace"
        >
          {t('market')}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          {t(checkout ? 'checkoutTitle' : 'cartTitle')}
        </span>
      </nav>
      <h1 className="sr-only max-tablet:hidden">
        {t(checkout ? 'checkoutTitle' : 'cartTitle')}
      </h1>
    </>
  )
}
