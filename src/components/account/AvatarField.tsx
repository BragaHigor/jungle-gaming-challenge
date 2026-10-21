import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarSchema, type AccountErrorCode } from '@/schemas/account'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'

export function AvatarField() {
  const { t } = useTranslation('account')
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<AccountErrorCode>()
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const change = (file: File | undefined) => {
    if (!file) return
    const result = avatarSchema.safeParse(file)
    if (!result.success) {
      const errorCode =
        result.error.issues[0].path[0] === 'size' ? 'avatarSize' : 'avatarType'
      setError(errorCode)
      return
    }
    setError(undefined)
    setPreview(URL.createObjectURL(file))
  }
  return (
    <fieldset>
      <legend className="mb-2">{t('avatar')}</legend>
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <div className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised text-primary">
          {preview ? (
            <img
              src={preview}
              alt={t('avatarPreview')}
              className="size-full object-cover"
              onError={() => {
                setError('avatarInvalid')
                setPreview('')
              }}
            />
          ) : (
            <Icon name="user" />
          )}
        </div>
        <input
          ref={input}
          className="sr-only"
          tabIndex={-1}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={t('chooseAvatar')}
          onChange={(event) => {
            change(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <Button type="button" onClick={() => input.current?.click()}>
          {t('changeAvatar')}
        </Button>
        <button
          type="button"
          disabled={!preview}
          onClick={() => {
            setPreview('')
            setError(undefined)
          }}
          className="min-h-11 text-sm disabled:opacity-40"
        >
          {t('removeAvatar')}
        </button>
      </div>
      <p className="mt-2 text-xs text-secondary">{t('avatarHint')}</p>
      <p role="status" className="mt-2 text-sm text-destructive">
        {error ? t(error) : ''}
      </p>
    </fieldset>
  )
}
