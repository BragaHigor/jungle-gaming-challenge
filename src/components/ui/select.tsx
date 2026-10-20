import type { ComponentProps } from 'react'
import { fieldControlStyles } from '@/components/ui/input'
import { cn } from '@/utils/cn'

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        fieldControlStyles,
        "field-select appearance-none bg-[url('/icons/select-chevron.svg')] bg-[position:right_0.75rem_center] bg-no-repeat pr-10 [&_option]:bg-surface [&_option]:text-foreground",
        className,
      )}
      {...props}
    />
  )
}
