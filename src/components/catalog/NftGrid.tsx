import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function NftGrid({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'nft-grid grid grid-cols-2 gap-x-4 gap-y-6 tablet:gap-6 desktop:grid-cols-3 desktop:gap-x-8 desktop:gap-y-10 max-tablet:items-start max-tablet:pb-8 max-tablet:[&>*:nth-child(even)]:translate-y-8',
        className,
      )}
      {...props}
    />
  )
}
