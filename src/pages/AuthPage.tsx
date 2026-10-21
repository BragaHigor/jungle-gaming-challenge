import { useRef, useState } from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { HomePage } from '@/pages/HomePage'
import { AccountFields } from '@/components/account/AccountFields'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import {
  loginSchema,
  registrationSchema,
  type AccountViewState,
  type RegistrationDraft,
} from '@/schemas/account'
import type { AccountErrors, AccountFieldName } from '@/types/account'
import { focusFirstInvalid, getAccountErrors } from '@/utils/forms'

const authFields = {
  login: ['email', 'password'],
  register: ['username', 'email', 'password', 'confirm'],
} as const
const providerMarks = {
  Google: (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285f4"
        d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92c-.26 1.28-1.04 2.36-2.21 3.09v2.56h3.58c2.1-1.94 3.27-4.8 3.27-8.16Z"
      />
      <path
        fill="#34a853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.68l-3.58-2.56c-.98.66-2.25 1.05-3.7 1.05-2.87 0-5.3-1.94-6.17-4.54H2.14v2.64C3.95 20.52 7.69 23 12 23Z"
      />
      <path
        fill="#fbbc05"
        d="M5.83 14.27c-.22-.66-.35-1.37-.35-2.1s.13-1.44.35-2.1V7.43H2.14A10.99 10.99 0 0 0 1 12.17c0 1.78.43 3.46 1.14 4.74l3.69-2.64Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.5c1.62 0 3.07.56 4.21 1.66l3.15-3.15C17.45 2.22 14.97 1 12 1 7.69 1 3.95 3.48 2.14 7.43l3.69 2.64C6.7 7.47 9.13 5.5 12 5.5Z"
      />
    </svg>
  ),
  Facebook: (
    <Icon
      name="facebook"
      className="size-5 fill-current text-[#4267b2]"
      strokeWidth={0}
    />
  ),
}
const authCopy = {
  login: {
    title: 'login',
    lead: 'loginLead',
    submit: 'login',
    mobileSubmit: 'login',
    switch: 'newAccount',
    destination: '/register',
  },
  register: {
    title: 'registerTitle',
    lead: 'registerLead',
    submit: 'createAccount',
    mobileSubmit: 'createProfile',
    switch: 'existingAccount',
    destination: '/login',
  },
} as const

export function AuthPage({
  mode,
  state = 'ready',
  onClose,
}: {
  mode: 'login' | 'register'
  state?: AccountViewState
  onClose: () => void
}) {
  const { t } = useTranslation('account')
  const { t: common } = useTranslation()
  const [draft, setDraft] = useState<RegistrationDraft>({
    username: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<AccountErrors>({})
  const [unavailable, setUnavailable] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const submit = useRef<HTMLButtonElement>(null)
  const copy = authCopy[mode]
  const isRegister = mode === 'register'
  const busy = state === 'loading'
  const loginCurrent = mode === 'login' ? 'page' : undefined
  const registerCurrent = isRegister ? 'page' : undefined
  const normalSubmitLabel = (
    <>
      <span className="max-tablet:hidden">{t(copy.submit)}</span>
      <span className="tablet:hidden">{t(copy.mobileSubmit)}</span>
    </>
  )
  const submitLabel = busy ? t('processing') : normalSubmitLabel
  const stateMessages = { error: 'authError', expired: 'expired' } as const
  const statusKey = stateMessages[state as keyof typeof stateMessages]
  const change = (name: AccountFieldName, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  const validate = () => {
    const schema = isRegister ? registrationSchema : loginSchema
    const result = schema.safeParse(draft)
    if (!result.success) {
      setErrors(getAccountErrors(result.error.issues))
      focusFirstInvalid(form.current)
      return
    }
    setErrors({})
    setDraft((current) => ({ ...current, password: '', confirm: '' }))
    setUnavailable(true)
  }
  return (
    <>
      <div aria-hidden="true" inert className="max-tablet:hidden">
        <HomePage />
      </div>
      <Primitive.Root
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <Primitive.Portal>
          <Primitive.Overlay className="fixed inset-0 z-80 bg-black/15 max-tablet:bg-background" />
          <Primitive.Content
            ref={panel}
            className="fixed top-1/2 left-1/2 z-81 flex max-h-[calc(100dvh_-_32px)] min-h-[min(590px,calc(100dvh_-_32px))] w-[min(500px,calc(100%_-_32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto border-b-[10px] border-primary bg-surface px-12 pt-10 pb-14 outline-none [&>*]:shrink-0 max-tablet:inset-0 max-tablet:h-dvh max-tablet:max-h-none max-tablet:min-h-0 max-tablet:w-full max-tablet:translate-0 max-tablet:border-0 max-tablet:bg-background max-tablet:px-7 max-tablet:pt-28 max-tablet:pb-10 max-tablet:[@media(max-height:600px)]:pt-16"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              panel.current?.focus()
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>('main')
                  ?.focus({ preventScroll: true }),
              )
            }}
          >
            <Primitive.Close
              aria-label={common('close')}
              className="absolute top-1 right-1 grid size-11 place-items-center text-primary"
            >
              <Icon name="close" />
            </Primitive.Close>
            <p
              aria-hidden="true"
              className="mb-14 text-center text-[32px] font-bold tracking-widest tablet:hidden"
            >
              KURIO
            </p>
            <nav
              aria-label={t('access')}
              className="mb-9 flex justify-center gap-2 text-lg font-bold max-tablet:hidden"
            >
              <Link
                to="/login"
                aria-current={loginCurrent}
                className="aria-[current=page]:text-primary"
              >
                {t('login')}
              </Link>
              <span aria-hidden="true" className="text-primary">
                |
              </span>
              <Link
                to="/register"
                aria-current={registerCurrent}
                className="aria-[current=page]:text-primary"
              >
                {t('createAccount')}
              </Link>
            </nav>
            <Primitive.Title className="mb-8 text-center text-lg font-bold tablet:sr-only">
              {t(copy.title)}
            </Primitive.Title>
            <Primitive.Description className="mb-6 text-center text-xs text-foreground max-tablet:sr-only">
              {t(copy.lead)}
            </Primitive.Description>
            <form
              ref={form}
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                if (!busy) validate()
              }}
              className="mx-auto w-full max-w-[340px]"
              aria-label={t(copy.title)}
            >
              <fieldset disabled={busy} aria-busy={busy} className="min-w-0">
                <AccountFields
                  fields={authFields[mode]}
                  values={draft}
                  errors={errors}
                  onChange={change}
                  compact
                  passwordHint={isRegister}
                  className="gap-y-3"
                />
                {!isRegister && (
                  <div className="mt-1 text-right">
                    <UnavailableAction className="min-h-11 text-sm text-primary">
                      {t('forgotPassword')}
                    </UnavailableAction>
                  </div>
                )}
                {statusKey && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {t(statusKey)}
                  </p>
                )}
                <Button
                  ref={submit}
                  type="submit"
                  className="mt-6 w-full text-base max-tablet:min-h-15 max-tablet:rounded-xl"
                >
                  {submitLabel}
                </Button>
              </fieldset>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              {t('orContinue')}
            </div>
            <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3">
              {(['Google', 'Facebook'] as const).map((provider) => (
                <UnavailableAction
                  key={provider}
                  disabled={busy}
                  className="flex min-h-11 items-center justify-center gap-3 rounded-sm border border-border px-3 py-2 text-xs text-secondary hover:border-primary"
                >
                  {providerMarks[provider]}
                  {t('continueProvider', { provider })}
                </UnavailableAction>
              ))}
            </div>
            <Link
              to={copy.destination}
              className="mt-10 min-h-11 content-center text-center text-sm text-secondary tablet:hidden"
            >
              {t(copy.switch)}
            </Link>
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
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </>
  )
}
