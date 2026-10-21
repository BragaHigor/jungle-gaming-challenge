import { useId, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PasswordField } from '@/components/ui/PasswordField'
import type {
  AccountErrors,
  AccountFieldName,
  AccountValues,
} from '@/types/account'
import { cn } from '@/utils/cn'

type InputSettings = Pick<
  ComponentProps<'input'>,
  'type' | 'autoComplete' | 'maxLength'
>
const inputSettings: Partial<Record<AccountFieldName, InputSettings>> = {
  email: {
    type: 'email',
    autoComplete: 'email',
  },
  username: { autoComplete: 'username', maxLength: 20 },
  displayName: { autoComplete: 'nickname' },
  password: { autoComplete: 'current-password' },
  currentPassword: { autoComplete: 'current-password' },
  newPassword: { autoComplete: 'new-password' },
  confirmPassword: { autoComplete: 'new-password' },
  confirm: { autoComplete: 'new-password' },
}
const selectOptions: Partial<Record<AccountFieldName, readonly string[]>> = {
  network: ['Ethereum', 'Polygon', 'Solana'],
  walletType: ['WalletConnect', 'MetaMask', 'Coinbase Wallet'],
}
const passwordFields: readonly AccountFieldName[] = [
  'password',
  'confirm',
  'currentPassword',
  'newPassword',
  'confirmPassword',
]
const optionalFields: readonly AccountFieldName[] = [
  'secondary',
  'currentPassword',
  'newPassword',
  'confirmPassword',
]

export function AccountFields({
  fields,
  values,
  errors,
  onChange,
  compact = false,
  passwordHint = false,
  placeholders,
  className,
}: {
  fields: readonly AccountFieldName[]
  values: AccountValues
  errors: AccountErrors
  onChange: (name: AccountFieldName, value: string) => void
  compact?: boolean
  passwordHint?: boolean
  placeholders?: Partial<Record<AccountFieldName, string>>
  className?: string
}) {
  const { t } = useTranslation('account')
  const { t: example } = useTranslation('examples')
  const prefix = useId()
  return (
    <div
      className={cn(
        'grid min-w-0 gap-x-7 gap-y-5',
        className,
        compact && '[&_.form-field>label]:sr-only [&_.form-field]:gap-0',
      )}
    >
      {fields.map((name) => {
        const id = `${prefix}-${name}`
        const error = errors[name] ? t(errors[name]) : undefined
        const showsHint =
          name === 'newPassword' || (name === 'password' && passwordHint)
        const hint = showsHint ? t('passwordHint') : undefined
        const descriptionIds =
          [error && `${id}-error`, hint && `${id}-hint`]
            .filter(Boolean)
            .join(' ') || undefined
        const common = {
          id,
          name,
          value: values[name] ?? '',
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
          ) => onChange(name, event.target.value),
          'aria-invalid': Boolean(error),
          'aria-required': !optionalFields.includes(name),
          'aria-describedby': descriptionIds,
        }
        const options = selectOptions[name]
        const attributes = {
          type: 'text',
          autoComplete: 'off',
          maxLength: 120,
          ...inputSettings[name],
        } as const
        const exampleKey =
          name === 'address' && values.network === 'Solana'
            ? 'solanaAddress'
            : name
        const placeholder = placeholders?.[name] ?? example(exampleKey)
        const controlClass = compact
          ? 'min-h-11 max-tablet:min-h-[50px] max-tablet:rounded-xl'
          : undefined
        let control = (
          <Input
            {...attributes}
            {...common}
            className={controlClass}
            placeholder={placeholder}
          />
        )
        if (passwordFields.includes(name))
          control = (
            <PasswordField
              {...common}
              maxLength={128}
              autoComplete={
                showsHint ? 'new-password' : attributes.autoComplete
              }
              placeholder={placeholder}
              className={controlClass}
            />
          )
        if (options)
          control = (
            <Select {...common}>
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          )
        return (
          <FormField
            key={name}
            id={id}
            label={t(name)}
            required={!optionalFields.includes(name)}
            error={error}
            hint={hint}
          >
            {control}
          </FormField>
        )
      })}
    </div>
  )
}
