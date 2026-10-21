import { useId, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { fieldControlStyles } from '@/components/ui/input'
import type { CollectorDraft, CollectorErrors } from '@/schemas/collector'

const fieldOptions: Partial<Record<keyof CollectorDraft, readonly string[]>> = {
  network: ['Ethereum', 'Polygon', 'Solana'],
  walletType: ['WalletConnect', 'MetaMask', 'Coinbase Wallet'],
}

const inputAttributes: Partial<
  Record<
    keyof CollectorDraft,
    Pick<
      ComponentProps<'input'>,
      'type' | 'maxLength' | 'autoComplete' | 'placeholder'
    >
  >
> = {
  email: { type: 'email', autoComplete: 'email' },
  displayName: { autoComplete: 'nickname' },
  referral: { maxLength: 40 },
  address: { placeholder: '0x…' },
  ens: { placeholder: 'name.eth' },
}

export function CollectorFields({
  value,
  errors,
  onChange,
  otherWallet,
  onOtherWalletChange,
}: {
  value: CollectorDraft
  errors: CollectorErrors
  onChange: (key: keyof CollectorDraft, value: string) => void
  otherWallet: boolean
  onOtherWalletChange: (checked: boolean) => void
}) {
  const { t } = useTranslation('purchase')
  const prefix = useId()
  return (
    <div>
      <div className="grid gap-x-6 gap-y-4 tablet:grid-cols-2">
        {(Object.keys(value) as (keyof CollectorDraft)[])
          .filter((key) => key !== 'note')
          .map((key) => {
            const id = `${prefix}-${key}`
            const error = errors[key] ? t(errors[key] as 'required') : undefined
            const options = fieldOptions[key]
            const common = {
              id,
              value: value[key],
              onChange: (
                event: React.ChangeEvent<
                  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                >,
              ) => onChange(key, event.target.value),
              'aria-invalid': Boolean(error),
              'aria-describedby': error ? `${id}-error` : undefined,
            }
            const control = options ? (
              <Select {...common}>
                {options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            ) : (
              <Input
                type="text"
                maxLength={120}
                autoComplete="off"
                {...inputAttributes[key]}
                {...common}
              />
            )
            return (
              <FormField
                key={key}
                id={id}
                label={t(key)}
                required={key !== 'secondary'}
                error={error}
              >
                {control}
              </FormField>
            )
          })}
      </div>
      <label className="my-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={otherWallet}
          onChange={(event) => onOtherWalletChange(event.target.checked)}
          className="size-4 accent-primary"
        />
        {t('otherWallet')}
      </label>
      <div className="tablet:max-w-[calc(50%_-_12px)]">
        <FormField
          id={`${prefix}-note`}
          label={t('note')}
          error={errors.note ? t('tooLong') : undefined}
        >
          <textarea
            id={`${prefix}-note`}
            value={value.note}
            onChange={(event) => onChange('note', event.target.value)}
            maxLength={500}
            rows={6}
            className={fieldControlStyles}
            aria-invalid={Boolean(errors.note)}
            aria-describedby={errors.note ? `${prefix}-note-error` : undefined}
          />
        </FormField>
      </div>
    </div>
  )
}
