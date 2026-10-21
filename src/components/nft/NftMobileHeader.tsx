import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/components/shared/LanguageSelect'
import { FavoriteButton } from '@/components/account/FavoriteButton'
import { Icon } from '@/components/ui/Icon'

export function NftMobileHeader({
  title,
  nftId,
}: {
  title?: string
  nftId?: string
}) {
  const { t } = useTranslation(['detail', 'card', 'navigation'])
  return (
    <div className="nft-mobile-topbar hidden min-h-14.5 items-center justify-between max-tablet:flex">
      <Link
        to="/"
        className="icon-button inline-grid size-11 place-items-center rounded-full bg-surface text-primary-hover"
        aria-label={t('detail:back')}
      >
        <Icon name="back" />
      </Link>
      <LanguageSelect compact id="detail-language" />
      {title && nftId ? (
        <FavoriteButton
          nftId={nftId}
          title={title}
          className="icon-button inline-grid size-11 place-items-center rounded-full bg-surface text-primary-hover disabled:opacity-55"
        />
      ) : (
        <span className="size-11" />
      )}
    </div>
  )
}
