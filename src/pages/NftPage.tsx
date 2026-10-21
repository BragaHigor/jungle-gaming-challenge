import { CarouselDots } from '@/components/ui/CarouselDots'
import { ethToWei, weiToEth } from '@/utils/eth'
import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { CatalogNft, ViewState } from '@/types/catalog'
import { NftGallery } from '@/components/nft/NftGallery'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { CatalogState } from '@/components/catalog/CatalogState'
import { NftCard } from '@/components/catalog/NftCard'
import { NftMobileHeader } from '@/components/nft/NftMobileHeader'
import { NftPageSkeleton } from '@/components/nft/NftPageSkeleton'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/button'

const editions = [
  { key: '1/1', max: 1 },
  { key: '1/10', max: 10 },
  { key: '1/50', max: 50 },
  { key: 'open', max: 99 },
] as const
const tabKeys = ['description', 'reviews'] as const

const getNextTabIndex = (key: string, currentIndex: number) => {
  const edgeIndexes = { Home: 0, End: tabKeys.length - 1 }
  if (key === 'Home' || key === 'End') return edgeIndexes[key]
  const direction = key === 'ArrowRight' ? 1 : -1
  return (currentIndex + direction + tabKeys.length) % tabKeys.length
}

export function NftPage({
  nft,
  related,
  state = 'ready',
  onRetry,
}: {
  nft?: CatalogNft
  related: readonly CatalogNft[]
  state?: ViewState
  onRetry: () => void
}) {
  const { t } = useTranslation(['detail', 'card', 'catalog', 'navigation'])
  const [edition, setEdition] = useState(2)
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState(0)
  const [relatedIndex, setRelatedIndex] = useState(0)
  const relatedTrack = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  if (state !== 'ready' || !nft) {
    const unavailableState = nft && state !== 'ready' ? state : 'unavailable'
    const content =
      nft && state === 'loading' ? (
        <NftPageSkeleton />
      ) : (
        <CatalogState state={unavailableState} titleAs="h1" onReset={onRetry} />
      )
    return (
      <>
        <NftMobileHeader />
        {content}
      </>
    )
  }
  const selectedEdition = editions[edition]
  const editionLabel =
    selectedEdition.key === 'open' ? t('detail:open') : selectedEdition.key
  const metadata = (
    <dl className="nft-metadata flex flex-col gap-3 pt-5 border-t border-t-border text-secondary max-tablet:mt-5 max-tablet:pt-0 max-tablet:border-0 max-tablet:gap-3 max-tablet:text-[13px] tablet:pt-0 tablet:border-0">
      <div className="flex flex-wrap gap-2">
        <dt>{t('detail:token')}</dt>
        <dd className="text-primary-hover wrap-anywhere">#{nft.token}</dd>
      </div>
      <div className="flex flex-wrap gap-2">
        <dt>{t('detail:collection')}</dt>
        <dd className="text-primary-hover wrap-anywhere">Kurio Apes</dd>
      </div>
      <div className="flex flex-wrap gap-2">
        <dt>{t('detail:attributes')}</dt>
        <dd className="text-primary-hover wrap-anywhere">
          {t(`detail:${nft.imageAltKey}`)}
        </dd>
      </div>
    </dl>
  )
  const purchaseControls = (
    <>
      <div className="purchase-summary max-tablet:flex max-tablet:justify-between max-tablet:items-center">
        <QuantityStepper
          value={quantity}
          max={editions[edition].max}
          onChange={setQuantity}
        />
        <p
          className="mobile-price hidden max-tablet:block max-tablet:text-[24px] max-tablet:text-primary-hover max-tablet:font-bold"
          aria-live="polite"
        >
          {weiToEth(ethToWei(nft.price) * BigInt(quantity))}{' '}
          <span className="max-tablet:text-[14px] max-tablet:font-normal">
            ETH
          </span>
        </p>
      </div>
      <div className="purchase-actions flex min-w-0 gap-3 items-center flex-1 tablet:flex-[0_1_auto]">
        <Button
          asChild
          className="nft-buy flex-1 tracking-[0.05em] tablet:min-w-32.5"
        >
          <Link to="/cart">
            {t('detail:buy')}
            <span className="mobile-buy-nft hidden max-tablet:inline">
              {' '}
              NFT
            </span>
          </Link>
        </Button>
        <UnavailableAction
          className="nft-add-cart border border-input text-primary-hover shrink-0 icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55"
          aria-label={t('detail:addCart')}
        >
          <Icon name="cart" />
        </UnavailableAction>
        <UnavailableAction
          className="nft-favorite border border-input text-primary-hover shrink-0 icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55"
          aria-label={t('card:favorite', { title: nft.title })}
        >
          <Icon name="heart" />
          <span className="max-tablet:hidden">{t('detail:favorite')}</span>
        </UnavailableAction>
      </div>
    </>
  )
  return (
    <>
      <NftMobileHeader title={nft.title} />
      <nav
        className="nft-breadcrumb flex flex-wrap gap-3 mb-8 text-secondary text-[12px] max-tablet:hidden tablet:mb-2"
        aria-label={t('detail:breadcrumb')}
      >
        <Link className="hover:text-primary-hover" to="/">
          {t('navigation:home')}
        </Link>
        <span>/</span>
        <Link className="hover:text-primary-hover" to="/" hash="marketplace">
          {t('navigation:market')}
        </Link>
        <span>/</span>
        <span aria-current="page">{nft.title}</span>
      </nav>
      <section
        className="nft-detail grid grid-cols-[572px_minmax(0,_1fr)] gap-8.5 items-start max-wide:tablet:grid-cols-1 max-wide:tablet:gap-10 max-tablet:flex max-tablet:flex-col max-tablet:gap-0"
        aria-labelledby="nft-title"
      >
        <NftGallery
          image={nft.image}
          alt={t(`card:${nft.imageAltKey}`)}
          title={nft.title}
        />
        <div className="nft-info max-tablet:relative max-tablet:w-[calc(100%_+_48px)] max-tablet:-mt-10 max-tablet:-mr-6 max-tablet:mb-0 max-tablet:-ml-6 max-tablet:pt-8 max-tablet:pr-6 max-tablet:pb-6 max-tablet:pl-6 max-tablet:[border-radius:24px_24px_0_0] max-tablet:[background:var(--gradient-surface)]">
          <div className="nft-title-row max-tablet:flex max-tablet:items-center max-tablet:justify-between max-tablet:gap-2">
            <h1
              className="text-[28px] leading-[1.4] font-bold max-tablet:text-[20px] max-tablet:leading-[28px] max-xs:text-[17px]"
              id="nft-title"
            >
              {nft.title}
            </h1>
            <a
              href="#nft-description"
              className="mobile-rating hidden max-tablet:block max-tablet:shrink-0 max-tablet:pt-1.5 max-tablet:pr-2 max-tablet:pb-1.5 max-tablet:pl-2 max-tablet:bg-surface max-tablet:rounded-[20px] max-tablet:text-[10px] max-tablet:text-primary-hover max-xs:text-[9px] max-xs:pt-1.5 max-xs:pr-1.5 max-xs:pb-1.5 max-xs:pl-1.5"
              onClick={() => setTab(1)}
            >
              ★ 4.8 (19)
            </a>
          </div>
          <div className="nft-price-rating tablet:flex tablet:flex-wrap tablet:items-center tablet:justify-between tablet:gap-3 tablet:border-b tablet:border-b-border tablet:pb-2 tablet:mt-2">
            <p className="nft-info-price text-primary-hover text-[20px] font-bold mt-3 max-tablet:hidden tablet:mt-0">
              {nft.price} ETH
            </p>
            <a
              className="nft-rating inline-flex gap-3 flex-wrap mt-4 text-[13px] max-tablet:hidden tablet:mt-0"
              href="#nft-description"
              onClick={() => setTab(1)}
            >
              <span
                className="text-primary-hover tracking-[4px]"
                aria-hidden="true"
              >
                ★★★★★
              </span>{' '}
              {t('detail:rating', { score: '4.8', count: 19 })}
            </a>
          </div>
          <h2 className="nft-about tablet:mt-3 tablet:text-[14px] tablet:font-bold max-tablet:hidden">
            {t('detail:about')}
          </h2>
          <p className="nft-description text-secondary leading-[24px] border-b border-b-border pb-6 mt-6 max-tablet:border-0 max-tablet:mt-4 max-tablet:pb-0 max-tablet:text-[14px] max-tablet:leading-[24px] max-tablet:max-w-82.5 tablet:mt-2 tablet:pb-0 tablet:border-0">
            <span className="hero-desktop max-tablet:hidden">
              {t('detail:shortDescription', { network: nft.network })}
            </span>
            <span className="hero-mobile hidden max-tablet:inline">
              {t('detail:mobileDescription', {
                network: nft.network,
                edition: editionLabel,
              })}
            </span>
          </p>
          <fieldset className="nft-editions min-w-0 mt-6 max-tablet:mt-4 tablet:mt-2 tablet:[&_button[aria-pressed='true']::before]:border-primary-hover">
            <legend className="text-secondary mb-3 max-tablet:text-[12px] max-tablet:mb-2 tablet:mb-0">
              {t('detail:edition')}
            </legend>
            <div className="flex flex-wrap gap-2 max-tablet:gap-3">
              {editions.map((item, index) => (
                <button
                  className="min-w-16 min-h-11 pt-1.5 pr-3 pb-1.5 pl-3 border border-input rounded text-secondary [&[aria-pressed='true']]:border-primary [&[aria-pressed='true']]:bg-primary [&[aria-pressed='true']]:text-background max-tablet:min-h-9 max-tablet:min-w-14 max-tablet:pt-1 max-tablet:pr-2 max-tablet:pb-1 max-tablet:pl-2 max-tablet:text-[12px] tablet:relative tablet:border-0 tablet:rounded-3xl tablet:min-w-10 tablet:pt-1 tablet:pr-2 tablet:pb-1 tablet:pl-2 tablet:bg-transparent tablet:text-[12px] tablet:before:absolute tablet:before:content-[''] tablet:before:[inset:10px_0] tablet:before:border tablet:before:border-input tablet:before:rounded-[20px] tablet:[&[aria-pressed='true']]:text-primary-hover tablet:[&[aria-pressed='true']]:bg-transparent"
                  type="button"
                  key={item.key}
                  aria-pressed={edition === index}
                  onClick={() => {
                    setEdition(index)
                    setQuantity((value) => Math.min(value, item.max))
                  }}
                >
                  {item.key === 'open' ? t('detail:open') : item.key}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="desktop-purchase flex items-center gap-4 mt-6 mr-0 mb-6 ml-0 [&_.nft-add-cart]:hidden max-wide:tablet:max-w-125 max-tablet:hidden tablet:mt-2 tablet:mr-0 tablet:mb-4 tablet:ml-0 tablet:justify-between tablet:[&_.nft-favorite]:flex tablet:[&_.nft-favorite]:w-auto tablet:[&_.nft-favorite]:pl-3 tablet:[&_.nft-favorite]:pr-3 tablet:[&_.nft-favorite]:gap-2 tablet:[&_.nft-favorite]:text-[13px]">
            {purchaseControls}
          </div>
          {metadata}
          <div className="nft-share flex flex-wrap items-center gap-2 mt-4 text-secondary text-[12px] [&_.icon-button]:w-9 max-tablet:hidden tablet:mt-1">
            <span>{t('detail:share')}</span>
            {(['facebook', 'twitter', 'linkedin'] as const).map((name) => (
              <UnavailableAction
                key={name}
                className="icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55"
                aria-label={t('detail:shareOn', { network: name })}
              >
                <Icon name={name} />
              </UnavailableAction>
            ))}
          </div>
        </div>
      </section>
      <div className="mobile-purchase hidden max-tablet:flex max-tablet:flex-col max-tablet:gap-4 max-tablet:fixed max-tablet:[@media(max-height:500px)]:static max-tablet:[@media(max-height:500px)]:mt-6 max-tablet:[inset:auto_0_0] max-tablet:[padding:20px_24px_calc(24px_+_env(safe-area-inset-bottom))] max-tablet:z-50 max-tablet:[border-radius:24px_24px_0_0] max-tablet:bg-surface max-tablet:[box-shadow:0_-8px_24px_rgb(0_0_0_/_15%)] max-tablet:[&_.quantity-stepper]:border-0 max-tablet:[&_.quantity-stepper]:gap-3 max-tablet:[&_.quantity-stepper_button]:bg-surface-band max-tablet:[&_.quantity-stepper_button]:rounded-full max-tablet:[&_.quantity-stepper_button]:w-9 max-tablet:[&_.quantity-stepper_button]:h-9 max-tablet:[&_.quantity-stepper_output]:min-w-4 max-tablet:[&_.nft-buy]:min-h-14 max-tablet:[&_.nft-buy]:rounded-[32px] max-tablet:[&_.nft-buy]:text-[16px] max-tablet:[&_.nft-add-cart]:w-14 max-tablet:[&_.nft-add-cart]:h-14 max-tablet:[&_.nft-add-cart]:rounded-full max-tablet:[&_.nft-favorite]:hidden">
        {purchaseControls}
      </div>
      <section
        className="nft-description-section mt-20 scroll-mt-6 max-tablet:mt-8"
        id="nft-description"
      >
        <div
          role="tablist"
          aria-label={t('detail:information')}
          className="nft-tabs flex overflow-x-auto border-b border-b-border gap-10 max-tablet:gap-6"
        >
          {tabKeys.map((key, index) => (
            <button
              className="min-h-13 border-b-2 border-b-transparent whitespace-nowrap text-secondary text-[16px] [&[aria-selected='true']]:text-primary-hover [&[aria-selected='true']]:border-b-primary max-tablet:text-[13px]"
              key={key}
              type="button"
              role="tab"
              ref={(node) => {
                tabs.current[index] = node
              }}
              id={`tab-${key}`}
              aria-controls={`panel-${key}`}
              aria-selected={tab === index}
              tabIndex={tab === index ? 0 : -1}
              onClick={() => setTab(index)}
              onKeyDown={(event) => {
                if (
                  !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                    event.key,
                  )
                )
                  return
                event.preventDefault()
                const next = getNextTabIndex(event.key, index)
                setTab(next)
                tabs.current[next]?.focus()
              }}
            >
              {t(`detail:${key}`)}
            </button>
          ))}
        </div>
        {tabKeys.map((key, index) => (
          <div
            key={key}
            id={`panel-${key}`}
            role="tabpanel"
            aria-labelledby={`tab-${key}`}
            hidden={tab !== index}
            tabIndex={0}
            className="nft-tab-panel pt-8 pr-0 pb-0 pl-0 leading-[26px] text-secondary min-h-60 [&>p_+_p]:mt-4 max-tablet:text-[13px] max-tablet:leading-[24px]"
          >
            {index === 0 ? (
              <>
                <p>
                  {t('detail:descriptionText', {
                    title: nft.title,
                    edition: editionLabel,
                    network: nft.network,
                  })}
                </p>
                <p>{t('detail:descriptionMore')}</p>
                <dl className="nft-specs grid grid-cols-3 gap-6 mt-6 max-tablet:grid-cols-1 max-tablet:gap-4 tablet:grid-cols-1 tablet:gap-3">
                  <div>
                    <dt className="text-primary-hover font-bold">
                      {t('detail:network')}
                    </dt>
                    <dd className="wrap-anywhere">{nft.network}</dd>
                  </div>
                  <div>
                    <dt className="text-primary-hover font-bold">
                      {t('detail:contract')}
                    </dt>
                    <dd className="wrap-anywhere">0x7A42…19E8</dd>
                  </div>
                  <div>
                    <dt className="text-primary-hover font-bold">
                      {t('detail:rights')}
                    </dt>
                    <dd className="wrap-anywhere">{t('detail:rightsText')}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="nft-review-summary [&_strong_span]:text-[20px]">
                <strong className="text-[28px] text-primary-hover">
                  4.8 <span aria-hidden="true">★★★★★</span>
                </strong>
                <p>{t('detail:reviewCount', { count: 19 })}</p>
              </div>
            )}
          </div>
        ))}
      </section>
      <section
        className="nft-related mt-20 max-tablet:mt-12"
        aria-labelledby="related-title"
      >
        <h2
          className="text-[24px] pb-5 mb-8 border-b border-b-border max-tablet:text-[20px]"
          id="related-title"
        >
          {t('detail:related')}
        </h2>
        <div
          className="related-track grid grid-flow-col auto-cols-[calc((100%_-_96px)_/_5)] gap-6 overflow-x-auto snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:var(--primary)_var(--surface)] pb-4 max-wide:tablet:auto-cols-[calc((100%_-_48px)_/_3)] max-tablet:auto-cols-[calc((100%_-_24px)_/_2)]"
          ref={relatedTrack}
          onScroll={() => {
            const track = relatedTrack.current
            if (track) {
              const maximum = track.scrollWidth - track.clientWidth
              setRelatedIndex(
                maximum ? Math.round((track.scrollLeft / maximum) * 4) : 0,
              )
            }
          }}
        >
          {related.slice(0, 5).map((card) => (
            <NftCard
              compact
              key={card.id}
              nft={{ ...card, imageAlt: t(`card:${card.imageAltKey}`) }}
            />
          ))}
        </div>
        <CarouselDots
          className="related-dots hidden max-wide:flex"
          label={t('detail:relatedNavigation')}
          count={Math.min(5, related.length)}
          value={relatedIndex}
          onChange={(index) => {
            const track = relatedTrack.current
            if (track) {
              track.scrollTo({
                left:
                  ((track.scrollWidth - track.clientWidth) * index) /
                  Math.max(1, Math.min(5, related.length) - 1),
              })
              setRelatedIndex(index)
            }
          }}
        />
      </section>
    </>
  )
}
