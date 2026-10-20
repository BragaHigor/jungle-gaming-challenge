import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/skeleton'

export type NftCardData = {
  id: string
  title: string
  image: string
  imageAlt: string
  price: string
  previousPrice?: string
  rare?: boolean
}

export function NftCard({
  nft,
  favorite = false,
  onFavoriteToggle,
}: {
  nft: NftCardData
  favorite?: boolean
  onFavoriteToggle?: () => void
}) {
  const { t } = useTranslation('card')
  return (
    <article className="nft-card">
      <div className="nft-card__media">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          aria-label={t('view', { title: nft.title })}
        >
          <img
            src={nft.image}
            alt={nft.imageAlt}
            width="512"
            height="512"
            loading="lazy"
            decoding="async"
          />
        </Link>
        {nft.rare && <span className="nft-card__badge">{t('rare')}</span>}
        <button
          type="button"
          className="nft-card__favorite icon-button"
          disabled={!onFavoriteToggle}
          aria-pressed={favorite}
          aria-label={t(favorite ? 'unfavorite' : 'favorite', {
            title: nft.title,
          })}
          onClick={onFavoriteToggle}
        >
          <Icon
            name="heart"
            className={favorite ? 'fill-current' : undefined}
          />
        </button>
      </div>
      <h3 className="nft-card__title">
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }}>
          {nft.title}
        </Link>
      </h3>
      <p className="nft-card__price">
        {nft.price} ETH
        {nft.previousPrice && (
          <del className="text-sm font-normal text-secondary">
            {nft.previousPrice} ETH
          </del>
        )}
      </p>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="nft-card" aria-hidden="true">
      <Skeleton className="nft-card__media" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  )
}
