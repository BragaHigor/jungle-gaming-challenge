import { cn } from '@/utils/cn'
import { Select } from '@/components/ui/select'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { categories, networks } from '@/constants/catalog'
import type { CatalogNft } from '@/types/catalog'
import type { CatalogControls } from '@/hooks/useCatalog'
import { centiEth } from '@/utils/eth'
import { Button } from '@/components/ui/button'

export function CatalogSort({
  controls,
  stacked = false,
}: {
  controls: CatalogControls
  stacked?: boolean
}) {
  const { t } = useTranslation('catalog')
  const id = useId()
  return (
    <label
      className={cn(
        'catalog-sort flex flex-wrap items-center gap-2 text-secondary text-[11px]',
        stacked &&
          'max-tablet:flex-col max-tablet:items-stretch max-tablet:text-[14px]',
      )}
      htmlFor={id}
    >
      <span className="shrink-0">{t('sort')}</span>
      <Select
        id={id}
        className={cn(
          'inline-flex w-auto items-center border-0 pl-0 text-[11px]',
          stacked &&
            'max-tablet:w-full max-tablet:border max-tablet:border-input max-tablet:pl-3 max-tablet:text-[14px]',
        )}
        value={controls.sort}
        onChange={(event) =>
          controls.setSort(event.target.value as CatalogControls['sort'])
        }
      >
        {(['recent', 'lowest', 'highest', 'name'] as const).map((value) => (
          <option
            className="bg-surface text-foreground"
            key={value}
            value={value}
          >
            {t(value)}
          </option>
        ))}
      </Select>
    </label>
  )
}

export function CatalogFilters({
  cards,
  controls,
}: {
  cards: readonly CatalogNft[]
  controls: CatalogControls
}) {
  const { t } = useTranslation('catalog')
  const id = useId()
  return (
    <div className="catalog-filters pt-3 pr-5 pb-5 pl-5 bg-surface max-tablet:pt-0 max-tablet:pr-0 max-tablet:pb-0 max-tablet:pl-0">
      <fieldset className="min-w-0 pt-0 pr-0 pb-0 pl-0 border-0 mb-7">
        <legend className="text-[18px] font-bold mb-3">
          {t('collections')}
        </legend>
        {categories.map((category) => (
          <label
            className="filter-check flex gap-3 items-center min-h-10 text-secondary text-[15px] cursor-pointer [&_.filter-count]:ml-auto [&_.filter-count]:text-muted-foreground [&_.filter-count]:text-[12px]"
            key={category}
          >
            <input
              className="appearance-none w-4 h-4 shrink-0 border border-primary bg-transparent rounded-xs [&:checked]:bg-primary [&:checked]:[box-shadow:inset_0_0_0_3px_var(--surface)]"
              type="checkbox"
              checked={controls.selectedCategories.includes(category)}
              onChange={() => controls.toggleCategory(category)}
            />
            <span>{t(category)}</span>
            <span className="filter-count">
              ({cards.filter((card) => card.category === category).length})
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="min-w-0 pt-0 pr-0 pb-0 pl-0 border-0 mb-7">
        <legend className="text-[18px] font-bold mb-3">
          {t('priceRange')}
        </legend>
        <div className="price-ranges flex flex-col">
          <label className="sr-only" htmlFor={`${id}-min`}>
            {t('minPrice')}
          </label>
          <input
            className="w-full h-8 accent-primary cursor-pointer"
            id={`${id}-min`}
            type="range"
            min="2"
            max="1230"
            value={controls.price[0]}
            onChange={(event) =>
              controls.setPrice([
                Math.min(Number(event.target.value), controls.price[1]),
                controls.price[1],
              ])
            }
          />
          <label className="sr-only" htmlFor={`${id}-max`}>
            {t('maxPrice')}
          </label>
          <input
            className="w-full h-8 accent-primary cursor-pointer"
            id={`${id}-max`}
            type="range"
            min="2"
            max="1230"
            value={controls.price[1]}
            onChange={(event) =>
              controls.setPrice([
                controls.price[0],
                Math.max(Number(event.target.value), controls.price[0]),
              ])
            }
          />
        </div>
        <p
          className="filter-price mt-2 mr-0 mb-4 ml-0 text-[12px] text-secondary tabular-nums"
          aria-live="polite"
        >
          {t('price')}: {centiEth(controls.price[0])} –{' '}
          {centiEth(controls.price[1])} ETH
        </p>
        <Button onClick={controls.applyPrice}>{t('apply')}</Button>
      </fieldset>
      <fieldset className="min-w-0 pt-0 pr-0 pb-0 pl-0 border-0 mb-7">
        <legend className="text-[18px] font-bold mb-3">{t('network')}</legend>
        {networks.map((network) => (
          <label
            className="filter-check flex gap-3 items-center min-h-10 text-secondary text-[15px] cursor-pointer [&_.filter-count]:ml-auto [&_.filter-count]:text-muted-foreground [&_.filter-count]:text-[12px]"
            key={network}
          >
            <input
              className="appearance-none w-4 h-4 shrink-0 border border-primary bg-transparent rounded-xs [&:checked]:bg-primary [&:checked]:[box-shadow:inset_0_0_0_3px_var(--surface)]"
              type="checkbox"
              checked={controls.selectedNetworks.includes(network)}
              onChange={() => controls.toggleNetwork(network)}
            />
            <span>{network}</span>
            <span className="filter-count">
              ({cards.filter((card) => card.network === network).length})
            </span>
          </label>
        ))}
      </fieldset>
      <button
        className="text-action text-primary-hover inline-flex items-center gap-2 min-h-11 text-left hover:underline"
        type="button"
        onClick={controls.reset}
      >
        {t('reset')}
      </button>
    </div>
  )
}
