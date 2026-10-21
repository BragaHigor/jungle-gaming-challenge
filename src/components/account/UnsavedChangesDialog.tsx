import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function UnsavedChangesDialog({
  open,
  onKeepEditing,
  onDiscard,
  onRestoreFocus,
}: {
  open: boolean
  onKeepEditing: () => void
  onDiscard: () => void
  onRestoreFocus?: () => void
}) {
  const { t } = useTranslation('account')
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onKeepEditing()
      }}
    >
      <DialogContent
        title={t('unsavedTitle')}
        description={t('unsavedDescription')}
        onCloseAutoFocus={(event) => {
          if (!onRestoreFocus) return
          event.preventDefault()
          requestAnimationFrame(onRestoreFocus)
        }}
      >
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onKeepEditing}>
            {t('keepEditing')}
          </Button>
          <Button type="button" onClick={onDiscard}>
            {t('discardChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
