import { DemoControls } from '@/components/demo/DemoControls'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/components/shared/LanguageSelect'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/Icon'

export function NavigationMenu({
  className,
  icon = 'menu',
}: {
  className?: string
  icon?: 'menu' | 'user'
}) {
  const { t } = useTranslation('navigation')
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
      <DialogTrigger asChild>
        <button className={className} type="button" aria-label={t('menu')}>
          <Icon name={icon} />
        </button>
      </DialogTrigger>
      <DialogContent
        placement="right"
        title={t('menuTitle')}
        description={t('menuDescription')}
      >
        <nav
          aria-label={t('main')}
          className="drawer-navigation flex flex-col [&_.nav-link]:min-h-12 [&_.nav-link]:pl-0 [&_.nav-link]:pr-0 [&_.nav-link]:border-b [&_.nav-link]:border-b-border"
        >
          <Link
            to="/"
            className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold"
            onClick={() => setMenuOpen(false)}
          >
            {t('home')}
          </Link>
          <Link
            to="/"
            hash="marketplace"
            className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold"
            onClick={() => setMenuOpen(false)}
          >
            {t('market')}
          </Link>
          <UnavailableAction className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold">
            {t('creators')}
          </UnavailableAction>
          <UnavailableAction className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold">
            {t('learn')}
          </UnavailableAction>
          <Link
            to="/login"
            className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold"
            onClick={() => setMenuOpen(false)}
          >
            {t('signIn')}
          </Link>
          <Link
            to="/profile"
            className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold"
            onClick={() => setMenuOpen(false)}
          >
            {t('account')}
          </Link>
          <Link
            to="/wallets"
            className="nav-link flex items-center min-h-[2.8125rem] pl-3 pr-3 text-[1rem] whitespace-nowrap border-b-3 border-b-transparent text-foreground hover:text-primary-hover [&.is-active]:text-primary-hover [&.is-active]:border-primary [&.is-active]:font-bold"
            onClick={() => setMenuOpen(false)}
          >
            {t('wallets')}
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <LanguageSelect id="menu-language" />
          <div className="mt-4">
            <DemoControls />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
