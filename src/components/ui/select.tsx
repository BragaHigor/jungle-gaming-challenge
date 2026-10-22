import type { ComponentProps, SyntheticEvent } from 'react'
import { fieldControlStyles } from '@/components/ui/input'
import { cn } from '@/utils/cn'

function containPickerScroll(event: SyntheticEvent<HTMLSelectElement>) {
  if (CSS.supports('selector(:open)') && event.currentTarget.matches(':open'))
    event.stopPropagation()
}

export function Select({
  className,
  onWheel,
  onTouchMove,
  ...props
}: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      onWheel={(event) => {
        onWheel?.(event)
        containPickerScroll(event)
      }}
      onTouchMove={(event) => {
        onTouchMove?.(event)
        containPickerScroll(event)
      }}
      className={cn(
        fieldControlStyles,
        "field-select appearance-none overflow-hidden text-ellipsis bg-[url('/icons/select-chevron.svg')] bg-[position:right_0.75rem_center] bg-no-repeat pr-8 text-left whitespace-nowrap [&_option]:bg-surface [&_option]:text-foreground",
        'supports-[appearance:base-select]:[appearance:base-select] [&::picker-icon]:hidden [&::picker(select)]:[appearance:base-select] [&::picker(select)]:mt-2 [&::picker(select)]:max-h-72 [&::picker(select)]:max-w-[calc(100vw_-_2rem)] [&::picker(select)]:overflow-y-auto [&::picker(select)]:rounded-md [&::picker(select)]:border [&::picker(select)]:border-input [&::picker(select)]:bg-surface [&::picker(select)]:p-1 [&::picker(select)]:text-foreground [&::picker(select)]:shadow-xl [&::picker(select)]:[min-width:anchor-size(width)]',
        '[&::picker(select)]:overscroll-contain [&::picker(select)]:[scrollbar-width:thin] [&::picker(select)]:[scrollbar-color:var(--primary)_var(--surface)] forced-colors:[&::picker(select)]:[scrollbar-color:auto]',
        '[&_option]:min-h-11 [&_option]:cursor-pointer [&_option]:items-center [&_option]:justify-start [&_option]:text-left [&_option]:whitespace-normal [&_option]:wrap-anywhere [&_option]:gap-3 [&_option]:rounded-sm [&_option]:px-3 [&_option]:py-2 [&_option]:text-sm [&_option]:transition-colors [&_option:hover]:bg-primary/15 [&_option:focus]:bg-primary/15 [&_option:focus]:outline-none [&_option:checked]:bg-primary/20 [&_option:checked]:text-primary-hover [&_option:disabled]:cursor-not-allowed [&_option:disabled]:opacity-50 [&_option::checkmark]:order-last [&_option::checkmark]:ml-auto [&_option::checkmark]:text-primary',
        className,
      )}
      {...props}
    />
  )
}
