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
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content
        className={cn(
          'dialog-content',
          placement === 'right' && 'dialog-content--sheet',
          className,
        )}
        {...props}
      >
        <div className="dialog-heading">
          <Primitive.Title className="text-lg font-bold">
            {title}
          </Primitive.Title>
          <Primitive.Close
            className="icon-button shrink-0"
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
