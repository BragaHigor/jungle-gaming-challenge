import type { ComponentProps } from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import { cn } from '@/utils/cn'

export const Dialog = Primitive.Root
export const DialogTrigger = Primitive.Trigger
export const DialogClose = Primitive.Close

export function DialogContent({
  title,
  description,
  placement = 'center',
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Primitive.Content>, 'title'> & {
  title: string
  description: string
  placement?: 'center' | 'right'
}) {
  const { t } = useTranslation()
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay fixed [inset:0] z-80 [background:rgb(10_6_4_/_75%)]" />
      <Primitive.Content
        className={cn(
          'dialog-content fixed top-1/2 left-1/2 z-81 flex flex-col gap-4 w-[min(32rem,_calc(100%_-_3rem))] max-h-[calc(100dvh_-_3rem)] [transform:translate(-50%,_-50%)] pt-6 pr-6 pb-6 pl-6 border border-input rounded-lg bg-surface overflow-y-auto wrap-anywhere [&>*]:shrink-0',
          placement === 'right' &&
            'dialog-content--sheet top-0 right-0 left-auto w-[min(23rem,_90vw)] h-dvh max-h-none [transform:none] rounded-none [border-width:0_0_0_1px]',
          className,
        )}
        {...props}
      >
        <div className="dialog-heading flex justify-between items-center gap-4">
          <Primitive.Title className="text-lg font-bold">
            {title}
          </Primitive.Title>
          <Primitive.Close
            className="icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55 shrink-0"
            aria-label={t('close')}
          >
            <Icon name="close" />
          </Primitive.Close>
        </div>
        <Primitive.Description className="text-sm leading-relaxed text-secondary">
          {description}
        </Primitive.Description>
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  )
}
