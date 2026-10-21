import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export function UnavailableAction({
  children,
  ...props
}: ComponentProps<'button'>) {
  const { t } = useTranslation()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" {...props}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent
        title={t('unavailableTitle')}
        description={t('unavailableDescription')}
      />
    </Dialog>
  )
}
