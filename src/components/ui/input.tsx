import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn('field-control', className)}
      {...props}
    />
  )
}
