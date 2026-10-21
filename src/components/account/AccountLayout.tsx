import { FavoritesDialog } from './FavoritesDialog'
import { useSession } from '@/hooks/useSession'
import { DemoControls } from '@/components/demo/DemoControls'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { Icon } from '@/components/ui/Icon'

const auxiliaryLinks = [
  { key: 'activity', icon: 'cart' },
  { key: 'offers', icon: 'scan' },
  { key: 'downloads', icon: 'down' },
  { key: 'support', icon: 'user' },
] as const
const linkClass =
  'flex min-h-11 w-full items-center gap-3 border-l-[6px] border-transparent px-3 py-2 text-left text-sm text-primary hover:bg-surface-raised aria-[current=page]:border-primary max-tablet:w-auto max-tablet:shrink-0 max-tablet:border-l-0 max-tablet:border-b-2 max-tablet:whitespace-nowrap'

export function AccountLayout({
  page,
  children,
}: {
  page: 'profile' | 'wallets'
  children: ReactNode
}) {
  const { t } = useTranslation('account')
  const { endSession } = useSession()
  const activeProfile = page === 'profile' ? 'page' : undefined
  const activeWallets = page === 'wallets' ? 'page' : undefined
  return (
    <div className="grid items-start gap-7 pb-16 tablet:grid-cols-[220px_minmax(0,1fr)] desktop:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="min-w-0 bg-surface py-3">
        <h2 className="mb-1 px-3 text-lg font-bold">{t('myProfile')}</h2>
        <nav
          aria-label={t('accountNavigation')}
          className="max-tablet:flex max-tablet:overflow-x-auto"
        >
          <Link
            to="/profile"
            aria-current={activeProfile}
            className={linkClass}
          >
            <Icon name="user" className="size-5 shrink-0" />
            {t('profileData')}
          </Link>
          <Link
            to="/wallets"
            aria-current={activeWallets}
            className={linkClass}
          >
            <Icon name="scan" className="size-5 shrink-0" />
            {t('walletsTitle')}
          </Link>
          <FavoritesDialog label={t('wishlist')} className={linkClass}>
            <Icon name="heart" className="size-5 shrink-0" />
            {t('wishlist')}
          </FavoritesDialog>
          {auxiliaryLinks.map((link) => (
            <UnavailableAction key={link.key} className={linkClass}>
              <Icon name={link.icon} className="size-5 shrink-0" />
              {t(link.key)}
            </UnavailableAction>
          ))}
          <button
            type="button"
            onClick={() => void endSession()}
            className={`${linkClass} border-t border-t-border font-bold`}
          >
            <Icon name="login" className="size-5 shrink-0" />
            {t('logout')}
          </button>
        </nav>
        <DemoControls />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
