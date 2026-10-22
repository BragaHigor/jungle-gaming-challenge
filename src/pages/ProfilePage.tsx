import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountLayout } from '@/components/account/AccountLayout'
import { AccountFields } from '@/components/account/AccountFields'
import { AccountState } from '@/components/account/AccountState'
import { UnsavedNavigationGuard } from '@/components/account/UnsavedNavigationGuard'
import { AvatarField } from '@/components/account/AvatarField'
import { QueryFeedback } from '@/components/shared/QueryFeedback'
import { Button } from '@/components/ui/button'
import { useProfileData } from '@/hooks/useAccountData'
import { profileSchema, type ProfileDraft } from '@/schemas/account'
import type { Profile } from '@/schemas/api/account'
import type { AccountErrors, AccountFieldName } from '@/types/account'
import { ApiError } from '@/api/client'
import {
  focusFirstInvalid,
  getAccountErrors,
  remoteAccountErrors,
} from '@/utils/forms'

const profileFields = ['displayName', 'username', 'email', 'ens'] as const
const passwordFields = [
  'currentPassword',
  'newPassword',
  'confirmPassword',
] as const
const profileDraft = (profile: Profile): ProfileDraft => ({
  displayName: profile.displayName,
  username: profile.username,
  email: profile.email,
  ens: profile.ens,
  walletNickname: profile.walletNickname,
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
function ProfileForm({
  profile,
  mutation,
  refresh,
}: {
  profile: Profile
  mutation: ReturnType<typeof useProfileData>['mutation']
  refresh: () => Promise<Profile | undefined>
}) {
  const { t } = useTranslation('account')
  const [draft, setDraft] = useState(() => profileDraft(profile))
  const [baseline, setBaseline] = useState(() => profileDraft(profile))
  const [savedAvatar, setSavedAvatar] = useState(profile.avatar)
  const [baseVersion, setBaseVersion] = useState(profile.version)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [avatarValid, setAvatarValid] = useState(true)
  const [focusRevision, setFocusRevision] = useState(0)
  const [errors, setErrors] = useState<AccountErrors>({})
  const [message, setMessage] = useState<
    'saved' | 'saveError' | 'saveConflict' | null
  >(null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!mutation.isPending && focusRevision > 0)
      focusFirstInvalid(form.current)
  }, [focusRevision, mutation.isPending])
  const change = (name: AccountFieldName, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setMessage(null)
  }
  const save = () => {
    if (mutation.isPending || !avatarValid) return
    const result = profileSchema.safeParse(draft)
    setMessage(null)
    if (!result.success) {
      setErrors(getAccountErrors(result.error.issues))
      setFocusRevision((value) => value + 1)
      return
    }
    setErrors({})
    mutation.mutate(
      { ...result.data, avatar, version: baseVersion },
      {
        onSuccess: (saved) => {
          setBaseVersion(saved.version)
          setDraft(profileDraft(saved))
          setBaseline(profileDraft(saved))
          setSavedAvatar(saved.avatar)
          setAvatar(saved.avatar)
          setMessage('saved')
        },
        onError: (error) => {
          if (error instanceof ApiError && error.fields) {
            setErrors(remoteAccountErrors(error.fields))
            setFocusRevision((value) => value + 1)
          }
          const conflict =
            error instanceof ApiError &&
            error.code === 'CONFLICT' &&
            !error.fields
          setMessage(conflict ? 'saveConflict' : 'saveError')
          if (conflict) refresh()
        },
      },
    )
  }
  const dirty =
    (Object.keys(draft) as (keyof ProfileDraft)[]).some(
      (field) => draft[field] !== baseline[field],
    ) || avatar !== savedAvatar
  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
      className="mt-8"
      aria-label={t('profileForm')}
      aria-busy={mutation.isPending}
    >
      <fieldset disabled={mutation.isPending} className="min-w-0">
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
          <AvatarField
            value={avatar}
            onChange={(value) => {
              setAvatar(value)
              setMessage(null)
            }}
            onValidityChange={(valid) => {
              setAvatarValid(valid)
              if (!valid) setMessage(null)
            }}
          />
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
          type="submit"
          disabled={!avatarValid}
          className="mt-8 min-w-32 max-tablet:w-full"
        >
          {t(mutation.isPending ? 'processing' : 'save')}
        </Button>
      </fieldset>
      {message && (
        <p
          className={`mt-4 text-sm ${message === 'saved' ? 'text-primary' : 'text-destructive'}`}
          role={message === 'saved' ? 'status' : 'alert'}
        >
          {t(message)}
          {message === 'saveConflict' && (
            <button
              type="button"
              className="mt-2 block min-h-11 underline"
              onClick={async () => {
                const latest = await refresh()
                if (!latest) return
                setDraft(profileDraft(latest))
                setBaseline(profileDraft(latest))
                setSavedAvatar(latest.avatar)
                setAvatar(latest.avatar)
                setBaseVersion(latest.version)
                setErrors({})
                setMessage(null)
              }}
            >
              {t('reloadSaved')}
            </button>
          )}
        </p>
      )}
      <UnsavedNavigationGuard dirty={dirty} />
    </form>
  )
}
export function ProfilePage() {
  const { t } = useTranslation('account')
  const { query, mutation } = useProfileData()
  let content = (
    <AccountState state="loading" onRetry={() => void query.refetch()} />
  )
  if (query.isError && !query.data)
    content = (
      <AccountState state="error" onRetry={() => void query.refetch()} />
    )
  if (query.data)
    content = (
      <ProfileForm
        profile={query.data}
        mutation={mutation}
        refresh={async () => (await query.refetch()).data}
      />
    )
  return (
    <AccountLayout page="profile">
      <h1 className="text-base font-bold">{t('profileTitle')}</h1>
      <QueryFeedback query={query} resource="account" />
      {content}
    </AccountLayout>
  )
}
