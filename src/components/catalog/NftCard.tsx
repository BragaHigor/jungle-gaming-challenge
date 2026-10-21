import type { NftCardData } from '@/types/catalog'
import { cn } from '@/utils/cn'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/skeleton'

export function NftCard({
  nft,
  favorite = false,
  onFavoriteToggle,
  compact = false,
}: {
  nft: NftCardData
  compact?: boolean
  favorite?: boolean
  onFavoriteToggle?: () => void
}) {
  const { t } = useTranslation('card')
  return (
    <article className="nft-card group min-w-0 snap-start">
      <div
        className={cn(
          'nft-card__media relative aspect-[1/1.2] bg-surface max-tablet:aspect-[1/1.13] max-tablet:rounded-[var(--radius-mobile)] max-tablet:bg-[image:var(--gradient-surface)] max-tablet:p-2',
          compact ? 'p-2 rounded-2xl' : 'p-4',
        )}
      >
        <Link
          className="block h-full"
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          aria-label={t('view', { title: nft.title })}
        >
          <img
            className="w-full h-full object-cover rounded-lg max-tablet:rounded-2xl"
            src={nft.image}
            alt={nft.imageAlt}
            width="512"
            height="512"
            loading="lazy"
            decoding="async"
          />
        </Link>
        {nft.rare && (
          <span className="nft-card__badge hidden absolute top-0 left-0 pt-1 pr-3.5 pb-1 pl-3.5 bg-primary text-background max-tablet:block max-tablet:top-4 max-tablet:pl-2 max-tablet:pr-2">
            {t('rare')}
          </span>
        )}
        <button
          type="button"
          className="nft-card__favorite icon-button absolute top-6 right-6 inline-grid size-11 place-items-center rounded-full border border-primary bg-surface text-primary-hover opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:disabled:opacity-55 max-tablet:top-3 max-tablet:right-3 max-tablet:opacity-55"
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
      <h3
        className={cn(
          'nft-card__title mt-3  font-normal wrap-anywhere max-tablet:ml-2 max-tablet:mr-2 max-tablet:mt-2 max-xs:text-[13px]',
          compact ? 'text-[13px]' : 'text-[0.9375rem]',
        )}
      >
        <Link
          className="hover:text-primary-hover"
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
        >
          {nft.title}
        </Link>
      </h3>
      <p
        className={cn(
          'nft-card__price flex flex-wrap gap-2.5 items-baseline  font-bold text-primary-hover tabular-nums max-tablet:ml-2 max-tablet:mr-2 max-xs:text-[14px]',
          compact ? 'text-[14px]' : 'text-[1rem]',
        )}
      >
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
    <div className="nft-card group min-w-0" aria-hidden="true">
      <Skeleton className="nft-card__media relative aspect-[1/1.2] bg-surface p-4 max-tablet:aspect-[1/1.13] max-tablet:rounded-[var(--radius-mobile)] max-tablet:bg-[image:var(--gradient-surface)] max-tablet:p-2" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  )
}
