import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('skeleton', className)}
    />
  )
}
