import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountLayout } from '@/components/account/AccountLayout'
import { AccountFields } from '@/components/account/AccountFields'
import { AccountState } from '@/components/account/AccountState'
import { UnsavedChangesDialog } from '@/components/account/UnsavedChangesDialog'
import { UnsavedNavigationGuard } from '@/components/account/UnsavedNavigationGuard'
import { Button } from '@/components/ui/button'
import { QueryFeedback } from '@/components/shared/QueryFeedback'
import { useWalletsData } from '@/hooks/useAccountData'
import { ApiError } from '@/api/client'
import type { SavedWallet } from '@/schemas/api/account'
import { walletSchema, type WalletDraft } from '@/schemas/account'
import type { AccountErrors, AccountFieldName } from '@/types/account'
import {
  focusFirstInvalid,
  getAccountErrors,
  remoteAccountErrors,
} from '@/utils/forms'

const emptyWallet: WalletDraft = {
  displayName: '',
  walletNickname: '',
  network: 'Ethereum',
  profileName: '',
  address: '',
  secondary: '',
  walletType: 'MetaMask',
  referral: '',
  email: '',
  ens: '',
}
const walletFields = [
  'displayName',
  'walletNickname',
  'network',
  'profileName',
  'address',
  'secondary',
  'walletType',
  'referral',
  'email',
  'ens',
] as const

type WalletAction = { walletId: string } | { secondary: boolean }

function WalletForm({
  wallets,
  mutation,
  refresh,
}: {
  wallets: readonly SavedWallet[]
  mutation: ReturnType<typeof useWalletsData>['mutation']
  refresh: () => unknown
}) {
  const { t } = useTranslation('account')
  const primary = wallets.find((wallet) => wallet.primary)
  const secondaryWallet = wallets.find((wallet) => !wallet.primary)
  const [draft, setDraft] = useState<WalletDraft>(() => ({
    ...emptyWallet,
    ...primary?.draft,
  }))
  const [baseline, setBaseline] = useState<WalletDraft>(() => ({
    ...emptyWallet,
    ...primary?.draft,
  }))
  const [pendingAction, setPendingAction] = useState<WalletAction | null>(null)
  const [focusRevision, setFocusRevision] = useState(0)
  const [errors, setErrors] = useState<AccountErrors>({})
  const [baseVersion, setBaseVersion] = useState(primary?.version)
  const [editing, setEditing] = useState(primary?.id ?? '')
  const [secondary, setSecondary] = useState(false)
  const [pendingSame, setPendingSame] = useState<boolean | null>(null)
  const sameWallet = pendingSame ?? primary?.sameAsPrimary ?? false
  const [message, setMessage] = useState<
    | 'saved'
    | 'preferenceSaved'
    | 'preferenceSavedDraft'
    | 'saveError'
    | 'saveConflict'
    | null
  >(null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!mutation.isPending && focusRevision > 0)
      focusFirstInvalid(form.current)
  }, [focusRevision, mutation.isPending])
  const submit = useRef<HTMLButtonElement>(null)
  const change = (name: AccountFieldName, value: string) => {
    setMessage(null)
    setDraft((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  const startNew = (isSecondary: boolean) => {
    setDraft({ ...emptyWallet })
    setBaseline({ ...emptyWallet })
    setErrors({})
    setEditing('')
    setBaseVersion(undefined)
    setSecondary(isSecondary)
    setMessage(null)
    requestAnimationFrame(() =>
      form.current?.querySelector<HTMLElement>('input')?.focus(),
    )
  }
  const editWallet = (wallet: SavedWallet) => {
    setDraft({ ...wallet.draft })
    setBaseline({ ...wallet.draft })
    setErrors({})
    setEditing(wallet.id)
    setBaseVersion(wallet.version)
    setSecondary(!wallet.primary)
    setMessage(null)
    requestAnimationFrame(() =>
      form.current?.querySelector<HTMLElement>('input')?.focus(),
    )
  }
  const dirty = walletFields.some((field) => draft[field] !== baseline[field])
  const performAction = (action: WalletAction) => {
    if ('walletId' in action) {
      const wallet = wallets.find((value) => value.id === action.walletId)
      if (wallet) editWallet(wallet)
      return
    }
    startNew(action.secondary)
  }
  const requestAction = (action: WalletAction) => {
    if ('walletId' in action && action.walletId === editing) return
    if (dirty) setPendingAction(action)
    else performAction(action)
  }
  const cancelEdit = () => {
    const saved = wallets.find((wallet) => wallet.id === editing) ?? primary
    if (saved) editWallet(saved)
    else startNew(false)
  }
  const validate = () => {
    if (mutation.isPending) return
    setMessage(null)
    const result = walletSchema.safeParse(draft)
    if (!result.success) {
      setErrors(getAccountErrors(result.error.issues))
      setFocusRevision((value) => value + 1)
      return
    }
    setErrors({})
    const current = wallets.find((wallet) => wallet.id === editing)
    mutation.mutate(
      {
        id: current?.id,
        body: {
          draft: result.data,
          primary: !secondary,
          sameAsPrimary: !secondary && sameWallet,
          version: baseVersion,
        },
      },
      {
        onSuccess: (saved) => {
          const wallet = saved.find((value) => value.primary === !secondary)!
          setEditing(wallet.id)
          setBaseVersion(wallet.version)
          setDraft({ ...wallet.draft })
          setBaseline({ ...wallet.draft })
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
  const formTitle = secondary ? 'secondaryWallet' : 'primaryWallet'
  let secondaryMessage: string | null = null
  if (sameWallet) secondaryMessage = t('sameWalletSelected')
  else if (!secondaryWallet) secondaryMessage = t('noSecondary')
  const successfulMessage =
    message === 'saved' ||
    message === 'preferenceSaved' ||
    message === 'preferenceSavedDraft'
  const canAddSecondary = Boolean(
    primary && !secondaryWallet && !(secondary && !editing),
  )
  const content = (
    <fieldset
      disabled={mutation.isPending}
      className="min-w-0"
      aria-busy={mutation.isPending}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{t(formTitle)}</h2>
        {canAddSecondary && (
          <button
            type="button"
            onClick={() => requestAction({ secondary: true })}
            className="min-h-11 text-primary disabled:opacity-40"
          >
            {t('addSecondary')}
          </button>
        )}
      </div>
      <p className="mb-7 text-sm text-secondary">{t('walletLead')}</p>
      {wallets.length > 0 && (
        <section aria-label={t('savedWallets')} className="mb-6 min-w-0">
          <h2 className="mb-2 text-sm font-bold">{t('savedWallets')}</h2>
          <p className="mb-3 text-xs text-secondary">{t('chooseWalletHelp')}</p>
          <div className="grid min-w-0 gap-3 desktop:grid-cols-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                aria-label={t('editWallet', { name: wallet.label })}
                aria-describedby={`wallet-role-${wallet.id} wallet-address-${wallet.id}`}
                aria-pressed={editing === wallet.id}
                onClick={() => requestAction({ walletId: wallet.id })}
                className="min-h-11 min-w-0 rounded-md border border-input px-4 py-3 text-left text-sm aria-pressed:border-primary aria-pressed:bg-surface"
              >
                <strong className="block wrap-anywhere">{wallet.label}</strong>
                <span
                  id={`wallet-role-${wallet.id}`}
                  className="mt-1 block text-xs text-secondary"
                >
                  {t(wallet.primary ? 'primaryWallet' : 'secondaryWallet')} ·{' '}
                  {wallet.draft.network}
                </span>
                <span
                  id={`wallet-address-${wallet.id}`}
                  className="mt-1 block truncate text-xs text-secondary"
                >
                  {wallet.draft.address}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      <form
        ref={form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          validate()
        }}
        aria-label={t('walletForm')}
      >
        <AccountFields
          fields={walletFields}
          values={draft}
          errors={errors}
          onChange={change}
          className="desktop:grid-cols-2"
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button ref={submit} type="submit" className="max-tablet:w-full">
            {t('saveWallet')}
          </Button>
          {(editing || secondary || dirty) && (
            <Button variant="outline" type="button" onClick={cancelEdit}>
              {t('cancel')}
            </Button>
          )}
        </div>
      </form>
      <section className="mt-8" aria-label={t('secondaryUsage')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{t('secondaryUsage')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sameWallet}
                disabled={!primary || mutation.isPending}
                onChange={(event) => {
                  if (!primary) return
                  setMessage(null)
                  setPendingSame(event.target.checked)
                  mutation.mutate(
                    {
                      id: primary.id,
                      body: {
                        draft: primary.draft,
                        primary: true,
                        sameAsPrimary: event.target.checked,
                        version: primary.version,
                      },
                    },
                    {
                      onSuccess: (saved) => {
                        if (editing === primary.id)
                          setBaseVersion(
                            saved.find((wallet) => wallet.id === primary.id)
                              ?.version,
                          )
                        setPendingSame(null)
                        setMessage(
                          dirty ? 'preferenceSavedDraft' : 'preferenceSaved',
                        )
                      },
                      onError: () => {
                        setPendingSame(null)
                        setMessage('saveError')
                      },
                    },
                  )
                }}
                className="size-4 accent-primary"
              />
              {t('sameWallet')}
            </label>
          </div>
        </div>
        {secondaryMessage && (
          <p className="text-sm text-secondary" role="status">
            {secondaryMessage}
          </p>
        )}
      </section>
      {message && (
        <p
          className={`mt-4 text-sm ${successfulMessage ? 'text-primary' : 'text-destructive'}`}
          role={successfulMessage ? 'status' : 'alert'}
        >
          {t(message)}
          {message === 'saveConflict' && (
            <button
              type="button"
              className="mt-2 block min-h-11 underline"
              onClick={() => {
                const latest = wallets.find((wallet) => wallet.id === editing)
                if (latest) editWallet(latest)
              }}
            >
              {t('reloadSaved')}
            </button>
          )}
        </p>
      )}
      <UnsavedNavigationGuard dirty={dirty} />
      <UnsavedChangesDialog
        open={Boolean(pendingAction)}
        onKeepEditing={() => setPendingAction(null)}
        onDiscard={() => {
          const action = pendingAction
          setPendingAction(null)
          if (action) performAction(action)
        }}
        onRestoreFocus={() =>
          form.current?.querySelector<HTMLElement>('input')?.focus()
        }
      />
    </fieldset>
  )
  return content
}
export function WalletsPage() {
  const { t } = useTranslation('account')
  const { query, mutation } = useWalletsData()
  let content = (
    <AccountState state="loading" onRetry={() => void query.refetch()} />
  )
  if (query.isError && !query.data)
    content = (
      <AccountState state="error" onRetry={() => void query.refetch()} />
    )
  if (query.data)
    content = (
      <WalletForm
        wallets={query.data}
        mutation={mutation}
        refresh={() => void query.refetch()}
      />
    )
  return (
    <AccountLayout page="wallets">
      <h1 className="sr-only">{t('walletsTitle')}</h1>
      <QueryFeedback query={query} resource="account" />
      {content}
    </AccountLayout>
  )
}
