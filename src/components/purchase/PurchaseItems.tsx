import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Icon } from '@/components/ui/Icon'
import type { PurchaseItem } from '@/types/purchase'
import { ethToWei, weiToEth } from '@/utils/eth'

export function PurchaseItems({
  items,
  onQuantity,
  onRemove,
}: {
  items: readonly PurchaseItem[]
  onQuantity?: (id: string, quantity: number) => void
  onRemove?: (id: string) => void
}) {
  const { t } = useTranslation('purchase')
  const { t: card } = useTranslation('card')
  const editable = Boolean(onQuantity)
  return (
    <div className="min-w-0">
      <div
        className={`mb-3 hidden gap-3 border-b border-primary pb-3 text-sm font-bold tablet:grid ${editable ? 'grid-cols-[minmax(0,1fr)_80px_136px_96px_44px]' : 'grid-cols-[1fr_auto]'}`}
        aria-hidden="true"
      >
        <span>NFTs</span>
        {editable && (
          <>
            <span>{t('price')}</span>
            <span>{t('editions')}</span>
          </>
        )}
        <span>{t('subtotal')}</span>
      </div>
      <ul className="space-y-3 max-tablet:space-y-5">
        {items.map(({ nft, quantity, available }) => (
          <li
            key={nft.id}
            className={`min-w-0 bg-surface ${editable ? 'relative grid grid-cols-[minmax(0,1fr)_auto] xs:max-tablet:min-h-[100px] xs:max-tablet:pb-0 gap-x-3 overflow-hidden rounded-2xl tablet:grid-cols-[minmax(0,1fr)_80px_136px_96px_44px] tablet:items-center tablet:gap-3 tablet:rounded-none max-tablet:pb-2' : 'grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 pr-3'}`}
          >
            {editable ? (
              <>
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  className="col-span-2 flex min-w-0 gap-3 pr-11 tablet:col-span-1 tablet:items-center tablet:pr-0"
                >
                  <img
                    src={nft.image}
                    alt={card(nft.imageAltKey)}
                    className="size-20 shrink-0 object-cover xs:max-tablet:size-[100px] tablet:size-[70px]"
                  />
                  <span className="min-w-0 pt-3 xs:max-tablet:pt-2 tablet:pt-0">
                    <strong className="block text-sm wrap-anywhere">
                      {nft.title}
                    </strong>
                    <small className="text-xs text-secondary xs:max-tablet:text-[10px]">
                      {t('token', { token: nft.token })}
                    </small>
                  </span>
                </Link>
                <span className="hidden text-sm text-secondary tablet:block">
                  {nft.price} ETH
                </span>
                <div className="col-start-2 row-start-2 pr-3 xs:max-tablet:absolute xs:max-tablet:right-0 xs:max-tablet:bottom-2 tablet:col-start-auto tablet:row-auto tablet:pr-0">
                  <QuantityStepper
                    value={quantity}
                    max={available}
                    onChange={(value) => onQuantity?.(nft.id, value)}
                  />
                </div>
                <strong className="col-start-1 row-start-2 self-center pl-3 text-sm text-primary xs:max-tablet:absolute xs:max-tablet:left-[112px] xs:max-tablet:bottom-4 xs:max-tablet:pl-0 tablet:col-start-auto tablet:row-auto tablet:pl-0">
                  {weiToEth(ethToWei(nft.price) * BigInt(quantity))} ETH
                </strong>
                <button
                  type="button"
                  aria-label={t('remove', { title: nft.title })}
                  className="absolute top-0 right-0 grid size-11 place-items-center text-secondary hover:text-destructive tablet:static"
                  onClick={() => onRemove?.(nft.id)}
                >
                  <Icon name="close" />
                </button>
              </>
            ) : (
              <>
                <img
                  src={nft.image}
                  alt={card(nft.imageAltKey)}
                  className="size-16 object-cover"
                />
                <div className="min-w-0">
                  <strong className="block text-xs wrap-anywhere">
                    {nft.title}
                  </strong>
                  <small className="text-xs text-secondary">
                    {t('token', { token: nft.token })} · ×{quantity}
                  </small>
                </div>
                <strong className="text-xs text-primary tabular-nums">
                  {weiToEth(ethToWei(nft.price) * BigInt(quantity))} ETH
                </strong>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
