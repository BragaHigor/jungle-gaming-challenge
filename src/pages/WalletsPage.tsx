import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountLayout } from '@/components/account/AccountLayout'
import { AccountFields } from '@/components/account/AccountFields'
import { AccountState } from '@/components/account/AccountState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  walletSchema,
  type WalletDraft,
  type AccountViewState,
} from '@/schemas/account'
import type {
  AccountErrors,
  AccountFieldName,
  SavedWallet,
} from '@/types/account'
import { focusFirstInvalid, getAccountErrors } from '@/utils/forms'

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

export function WalletsPage({
  wallets = [],
  state = 'ready',
  onRetry,
}: {
  wallets?: readonly SavedWallet[]
  state?: AccountViewState
  onRetry: () => void
}) {
  const { t } = useTranslation('account')
  const { t: common } = useTranslation()
  const [draft, setDraft] = useState<WalletDraft>({ ...emptyWallet })
  const [errors, setErrors] = useState<AccountErrors>({})
  const [editing, setEditing] = useState('')
  const [secondary, setSecondary] = useState(false)
  const [sameWallet, setSameWallet] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const submit = useRef<HTMLButtonElement>(null)
  const change = (name: AccountFieldName, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  const startNew = (isSecondary: boolean) => {
    setDraft({ ...emptyWallet })
    setErrors({})
    setEditing('')
    setSecondary(isSecondary)
    requestAnimationFrame(() =>
      form.current?.querySelector<HTMLElement>('input')?.focus(),
    )
  }
  const editWallet = (wallet: SavedWallet) => {
    setDraft({ ...wallet.draft })
    setErrors({})
    setEditing(wallet.id)
    setSecondary(false)
    requestAnimationFrame(() =>
      form.current?.querySelector<HTMLElement>('input')?.focus(),
    )
  }
  const validate = () => {
    const result = walletSchema.safeParse(draft)
    if (!result.success) {
      setErrors(getAccountErrors(result.error.issues))
      focusFirstInvalid(form.current)
      return
    }
    setErrors({})
    setUnavailable(true)
  }
  const formTitle = secondary ? 'secondaryWallet' : 'primaryWallet'
  const secondaryMessage = sameWallet
    ? t('sameWalletSelected')
    : t('noSecondary')
  const content =
    state === 'ready' ? (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{t(formTitle)}</h2>
          <button
            type="button"
            onClick={() => startNew(false)}
            className="min-h-11 text-primary"
          >
            {t('add')}
          </button>
        </div>
        <p className="mb-7 text-sm text-secondary">{t('walletLead')}</p>
        {wallets.length > 0 && (
          <section
            aria-label={t('savedWallets')}
            className="mb-6 flex flex-wrap gap-3"
          >
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                aria-pressed={editing === wallet.id}
                onClick={() => editWallet(wallet)}
                className="min-h-11 rounded-md border border-input px-4 py-2 text-sm aria-pressed:border-primary"
              >
                {t('editWallet', { name: wallet.label })}
              </button>
            ))}
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
            {(editing || secondary) && (
              <Button
                variant="outline"
                type="button"
                onClick={() => startNew(false)}
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        </form>
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">{t('secondaryWallet')}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sameWallet}
                  onChange={(event) => setSameWallet(event.target.checked)}
                  className="size-4 accent-primary"
                />
                {t('sameWallet')}
              </label>
              <button
                type="button"
                disabled={sameWallet}
                className="min-h-11 text-primary disabled:opacity-40"
                onClick={() => startNew(true)}
              >
                {t('addSecondary')}
              </button>
            </div>
          </div>
          <p className="text-sm text-secondary" role="status">
            {secondaryMessage}
          </p>
        </section>
      </>
    ) : (
      <AccountState state={state} onRetry={onRetry} />
    )
  return (
    <AccountLayout page="wallets">
      <h1 className="sr-only">{t('walletsTitle')}</h1>
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
