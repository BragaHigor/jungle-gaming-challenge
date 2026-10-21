import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { avatarDataSchema } from '@/schemas/avatar'
import { avatarSchema, type AccountErrorCode } from '@/schemas/account'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'

export function AvatarField({
  value,
  onChange,
  onValidityChange,
  disabled = false,
}: {
  value: string | null
  onChange: (value: string | null) => void
  onValidityChange: (valid: boolean) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('account')
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<AccountErrorCode>()
  const id = useId()
  const reader = useRef<FileReader | null>(null)
  const sequence = useRef(0)
  const [reading, setReading] = useState(false)
  useEffect(
    () => () => {
      sequence.current++
      reader.current?.abort()
    },
    [],
  )
  const change = async (file: File | undefined) => {
    if (!file) return
    const current = ++sequence.current
    reader.current?.abort()
    const result = avatarSchema.safeParse(file)
    if (!result.success) {
      setReading(false)
      setError(
        result.error.issues[0].path[0] === 'size' ? 'avatarSize' : 'avatarType',
      )
      onValidityChange(false)
      return
    }
    setError(undefined)
    setReading(true)
    onValidityChange(false)
    const fileReader = new FileReader()
    reader.current = fileReader
    fileReader.onload = async () => {
      try {
        const data = avatarDataSchema.parse(String(fileReader.result))
        const image = new Image()
        image.src = data
        await image.decode()
        if (sequence.current !== current) return
        onChange(data)
        onValidityChange(true)
        setReading(false)
      } catch {
        if (sequence.current !== current) return
        setError('avatarInvalid')
        setReading(false)
      }
    }
    fileReader.onerror = () => {
      if (sequence.current !== current) return
      setError('avatarInvalid')
      setReading(false)
    }
    fileReader.readAsDataURL(file)
  }
  return (
    <fieldset disabled={disabled} aria-busy={reading}>
      <legend className="mb-2">{t('avatar')}</legend>
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <div className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised text-primary">
          {value ? (
            <img
              src={value}
              alt={t('avatarPreview')}
              className="size-full object-cover"
              onError={() => {
                setError('avatarInvalid')
                onValidityChange(false)
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
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-error`}
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
          disabled={!value && !error}
          onClick={() => {
            sequence.current++
            reader.current?.abort()
            setReading(false)
            onChange(null)
            onValidityChange(true)
            setError(undefined)
          }}
          className="min-h-11 text-sm disabled:opacity-40"
        >
          {t('removeAvatar')}
        </button>
      </div>
      <p className="mt-2 text-xs text-secondary">{t('avatarHint')}</p>
      <p
        id={`${id}-error`}
        role="status"
        className="mt-2 text-sm text-destructive"
      >
        {error ? t(error) : ''}
      </p>
    </fieldset>
  )
}
