import { NftGrid } from '@/components/NftGrid'
import { useTranslation } from 'react-i18next'
import type { ViewState } from '@/types/catalog'
import { Button } from '@/components/ui/button'
import { NftCardSkeleton } from '@/components/NftCard'

export function CatalogState({
  state,
  onReset,
  titleAs: Heading = 'h2',
}: {
  state: Exclude<ViewState, 'ready'>
  onReset: () => void
  titleAs?: 'h1' | 'h2'
}) {
  const { t } = useTranslation('catalog')
  if (state === 'loading')
    return (
      <div aria-busy="true">
        <p role="status" className="sr-only">
          {t('loading')}
        </p>
        <NftGrid>
          {Array.from({ length: 9 }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </NftGrid>
      </div>
    )
  return (
    <div
      className="catalog-state flex flex-col items-center justify-center gap-5 text-center pt-12 pr-6 pb-12 pl-6 min-h-90 bg-surface rounded-xl"
      role="status"
    >
      <Heading className="text-[22px] font-bold">{t(`${state}Title`)}</Heading>
      <p className="max-w-110 text-secondary">{t(`${state}Text`)}</p>
      <Button variant="outline" onClick={onReset}>
        {t(state === 'empty' ? 'reset' : 'retry')}
      </Button>
    </div>
  )
}
