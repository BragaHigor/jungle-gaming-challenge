import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'

export function NftPageSkeleton() {
  const { t } = useTranslation('detail')
  return (
    <div className="nft-detail-loading" aria-busy="true">
      <p role="status" className="sr-only">
        {t('loading')}
      </p>
      <div aria-hidden="true">
        <Skeleton className="mb-2 hidden h-4 w-64 tablet:block" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 wide:grid-cols-[572px_minmax(0,1fr)] max-tablet:gap-0">
          <div className="mx-auto grid w-full max-w-155 grid-cols-[100px_minmax(0,1fr)] gap-7 max-tablet:block">
            <div className="flex flex-col gap-4 max-tablet:hidden">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="size-25 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="aspect-square w-full rounded-3xl" />
          </div>
          <div className="flex flex-col gap-5 max-tablet:relative max-tablet:-mx-6 max-tablet:-mt-10 max-tablet:rounded-t-3xl max-tablet:bg-surface max-tablet:p-6">
            <Skeleton className="h-8 w-3/4 max-tablet:bg-surface-raised" />
            <Skeleton className="h-6 w-1/3 max-tablet:bg-surface-raised" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-4 w-full max-tablet:bg-surface-raised"
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-9 w-14 max-tablet:bg-surface-raised"
                />
              ))}
            </div>
            <Skeleton className="h-11 w-full max-tablet:bg-surface-raised" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-4 w-2/3 max-tablet:bg-surface-raised"
                />
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="mt-20 h-12 w-full max-tablet:mt-8" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
