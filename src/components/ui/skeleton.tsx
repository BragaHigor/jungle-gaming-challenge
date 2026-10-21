import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "skeleton relative overflow-hidden bg-surface rounded-md after:content-[''] after:absolute after:[inset:0] after:[transform:translateX(-100%)] after:[background:linear-gradient(_90deg,_transparent,_var(--surface-raised),_transparent_)] after:animate-shimmer",
        className,
      )}
    />
  )
}
