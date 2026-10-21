import type { PublicUser } from '@/schemas/api/account'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountLayout } from '@/components/account/AccountLayout'
import { AccountFields } from '@/components/account/AccountFields'
import { AccountState } from '@/components/account/AccountState'
import { AvatarField } from '@/components/account/AvatarField'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  profileSchema,
  type ProfileDraft,
  type AccountViewState,
} from '@/schemas/account'
import type { AccountErrors, AccountFieldName } from '@/types/account'
import { focusFirstInvalid, getAccountErrors } from '@/utils/forms'

const profileFields = ['displayName', 'username', 'email', 'ens'] as const
const passwordFields = [
  'currentPassword',
  'newPassword',
  'confirmPassword',
] as const

export function ProfilePage({
  state = 'ready',
  onRetry,
  user,
}: {
  state?: AccountViewState
  onRetry: () => void
  user?: PublicUser
}) {
  const { t } = useTranslation('account')
  const { t: common } = useTranslation()
  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: user?.displayName ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    ens: '',
    walletNickname: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<AccountErrors>({})
  const [unavailable, setUnavailable] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const submit = useRef<HTMLButtonElement>(null)
  const change = (name: AccountFieldName, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  const validate = () => {
    const result = profileSchema.safeParse(draft)
    if (!result.success) {
      setErrors(getAccountErrors(result.error.issues))
      focusFirstInvalid(form.current)
      return
    }
    setErrors({})
    setDraft((current) => ({
      ...current,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }))
    setUnavailable(true)
  }
  const content =
    state === 'ready' ? (
      <form
        ref={form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          validate()
        }}
        className="mt-8"
        aria-label={t('profileForm')}
      >
        <div className="grid items-start gap-x-7 gap-y-5 desktop:grid-cols-2">
          <AccountFields
            fields={profileFields}
            values={draft}
            errors={errors}
            onChange={change}
            className="desktop:col-span-2 desktop:grid-cols-2"
          />
          <AccountFields
            fields={['walletNickname']}
            values={draft}
            errors={errors}
            onChange={change}
          />
          <AvatarField />
        </div>
        <h2 className="mt-8 mb-5 text-base font-bold">{t('changePassword')}</h2>
        <AccountFields
          fields={passwordFields}
          values={draft}
          errors={errors}
          onChange={change}
          className="max-w-[418px]"
        />
        <Button
          ref={submit}
          type="submit"
          className="mt-8 min-w-32 max-tablet:w-full"
        >
          {t('save')}
        </Button>
      </form>
    ) : (
      <AccountState state={state} onRetry={onRetry} />
    )
  return (
    <AccountLayout page="profile">
      <h1 className="text-base font-bold">{t('profileTitle')}</h1>
      {content}
      <Dialog open={unavailable} onOpenChange={setUnavailable}>
        <DialogContent
          title={common('unavailableTitle')}
          description={common('unavailableDescription')}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            submit.current?.focus()
          }}
        />
      </Dialog>
    </AccountLayout>
  )
}
