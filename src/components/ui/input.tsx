import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export const fieldControlStyles =
  'field-control min-h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-[0.875rem] text-foreground placeholder:text-muted-foreground placeholder:opacity-100 aria-invalid:border-destructive'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(fieldControlStyles, className)}
      {...props}
    />
  )
}
