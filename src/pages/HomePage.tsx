import { NftGrid } from '@/components/NftGrid'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NftCard } from '@/components/NftCard'
import { CatalogHero } from '@/components/CatalogHero'
import { CatalogFilters, CatalogSort } from '@/components/CatalogFilters'
import { CatalogState } from '@/components/CatalogState'
import { HomeHighlights } from '@/components/HomeHighlights'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import { useCatalog } from '@/hooks/useCatalog'
import type { CatalogNft, ViewState } from '@/types/catalog'

export function HomePage({
  cards,
  initialQuery = '',
  state = 'ready',
  onRetry,
}: {
  cards: readonly CatalogNft[]
  initialQuery?: string
  state?: ViewState
  onRetry: () => void
}) {
  const { t } = useTranslation(['common', 'catalog', 'card', 'navigation'])
  const controls = useCatalog(cards, initialQuery)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeState = state === 'ready' && !controls.total ? 'empty' : state
  const reset = () => {
    controls.reset()
    onRetry()
  }
  return (
    <>
      <div className="mobile-catalog-search hidden max-tablet:flex max-tablet:gap-2 max-tablet:h-11 max-tablet:mb-4 max-tablet:[&>button]:[background:var(--gradient-copper)] max-tablet:[&>button]:rounded-xl max-tablet:[&>button]:shrink-0 max-tablet:[&>button]:text-background">
        <label className="max-tablet:flex max-tablet:items-center max-tablet:gap-3 max-tablet:min-w-0 max-tablet:flex-1 max-tablet:rounded-xl max-tablet:bg-surface max-tablet:pt-0 max-tablet:pr-3 max-tablet:pb-0 max-tablet:pl-3 max-tablet:text-secondary">
          <Icon name="search" className="shrink-0" />
          <span className="sr-only">{t('navigation:search')}</span>
          <input
            className="max-tablet:w-full max-tablet:min-w-0 max-tablet:h-11 max-tablet:bg-transparent max-tablet:text-[14px]"
            type="search"
            maxLength={120}
            placeholder={t('catalog:searchPlaceholder')}
            value={controls.query}
            onChange={(event) => controls.setQuery(event.target.value)}
          />
        </label>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <button
              className="icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55"
              type="button"
              aria-label={t('catalog:filters')}
            >
              <Icon name="filter" />
            </button>
          </DialogTrigger>
          <DialogContent
            placement="right"
            title={t('catalog:filters')}
            description={t('catalog:filtersDescription')}
          >
            <CatalogFilters cards={cards} controls={controls} />
            <CatalogSort controls={controls} stacked />
            <DialogClose asChild>
              <Button>
                {t('catalog:showResults', { count: controls.total })}
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
      <CatalogHero />
      <section
        id="marketplace"
        className="catalog mt-24 scroll-mt-6 max-tablet:mt-3"
        aria-labelledby="catalog-title"
      >
        <h2 id="catalog-title" className="sr-only">
          {t('common:title')}
        </h2>
        <div className="catalog-layout grid grid-cols-[310px_minmax(0,_1fr)] gap-8.5 max-desktop:tablet:grid-cols-[240px_minmax(0,_1fr)] max-desktop:tablet:gap-6 max-tablet:block">
          <aside
            className="catalog-sidebar max-tablet:hidden"
            aria-label={t('catalog:filters')}
          >
            <CatalogFilters cards={cards} controls={controls} />
            <section className="catalog-featured mt-6 [&_h3_span]:block [&_h3_span]:text-secondary [&_h3_span]:text-[12px] [&_h3_span]:font-normal [&_h3_span]:mt-1">
              <h3 className="text-[16px] font-bold mb-5">
                {t('catalog:featured')}
                <span>{t('catalog:limitedOffer')}</span>
              </h3>
              <Link to="/nfts/$nftId" params={{ nftId: 'sage-nomad-009' }}>
                <img
                  className="w-full aspect-[1/1.18] object-cover rounded-3xl"
                  src="/images/nft-artwork-02.webp"
                  width="310"
                  height="360"
                  loading="lazy"
                  alt={t('card:sageAlt')}
                />
              </Link>
            </section>
          </aside>
          <div className="catalog-main min-w-0">
            <div className="catalog-toolbar flex flex-wrap items-center justify-between gap-3 mb-6 max-desktop:tablet:items-start max-tablet:block max-tablet:mb-4">
              <div
                className="catalog-tabs flex gap-5 min-w-0 max-desktop:tablet:gap-3 max-tablet:gap-5 max-tablet:overflow-x-auto max-tablet:[scrollbar-width:none] max-tablet:pl-1 max-tablet:pr-1"
                role="group"
                aria-label={t('catalog:list')}
              >
                {(['all', 'new', 'hot'] as const).map((tab) => (
                  <button
                    className="text-[13px] min-h-11 whitespace-nowrap border-b-2 border-b-transparent [&[aria-pressed='true']]:border-primary [&[aria-pressed='true']]:text-primary-hover max-tablet:text-[12px]"
                    type="button"
                    key={tab}
                    aria-pressed={controls.tab === tab}
                    onClick={() => controls.setTab(tab)}
                  >
                    {t(`catalog:${tab}`)}
                  </button>
                ))}
              </div>
              <div className="desktop-sort max-tablet:hidden">
                <CatalogSort controls={controls} />
              </div>
            </div>

            <p className="sr-only" role="status">
              {t('catalog:results', { count: controls.total })}
            </p>
            {activeState !== 'ready' ? (
              <CatalogState state={activeState} onReset={reset} />
            ) : (
              <>
                <NftGrid className="catalog-grid">
                  {controls.visible.map((card) => (
                    <NftCard
                      key={card.id}
                      nft={{ ...card, imageAlt: t(`card:${card.imageAltKey}`) }}
                    />
                  ))}
                </NftGrid>
                <nav
                  className="catalog-pagination flex justify-end gap-1 mt-14 max-tablet:justify-center max-tablet:mt-8"
                  aria-label={t('catalog:pagination')}
                >
                  <button
                    className="w-11 h-11 text-secondary [&[aria-current='page']]:bg-primary [&[aria-current='page']]:text-background [&[aria-current='page']]:rounded-sm disabled:opacity-35"
                    type="button"
                    disabled={controls.page === 1}
                    aria-label={t('catalog:previousPage')}
                    onClick={() => controls.setPage(controls.page - 1)}
                  >
                    ‹
                  </button>
                  {Array.from({ length: controls.pageCount }, (_, index) => (
                    <button
                      className="w-11 h-11 text-secondary [&[aria-current='page']]:bg-primary [&[aria-current='page']]:text-background [&[aria-current='page']]:rounded-sm disabled:opacity-35"
                      type="button"
                      key={index}
                      aria-label={t('catalog:page', { number: index + 1 })}
                      aria-current={
                        controls.page === index + 1 ? 'page' : undefined
                      }
                      onClick={() => controls.setPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    className="w-11 h-11 text-secondary [&[aria-current='page']]:bg-primary [&[aria-current='page']]:text-background [&[aria-current='page']]:rounded-sm disabled:opacity-35"
                    type="button"
                    disabled={controls.page === controls.pageCount}
                    aria-label={t('catalog:nextPage')}
                    onClick={() => controls.setPage(controls.page + 1)}
                  >
                    ›
                  </button>
                </nav>
              </>
            )}
          </div>
        </div>
      </section>
      <HomeHighlights onExplore={controls.explore} />
    </>
  )
}
