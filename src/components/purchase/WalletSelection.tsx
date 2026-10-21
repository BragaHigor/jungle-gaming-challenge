import { Select } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import type { WalletOption } from '@/types/purchase'
import type { CollectorDraft } from '@/schemas/collector'

const radioClassName =
  'size-5 shrink-0 appearance-none rounded-full border border-primary bg-transparent checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--surface)]'

export function WalletSelection({
  provider,
  onProviderChange,
  selected,
  onSelect,
  wallets,
}: {
  provider: CollectorDraft['walletType']
  onProviderChange: (value: CollectorDraft['walletType']) => void
  selected: string
  onSelect: (id: string) => void
  wallets: readonly WalletOption[]
}) {
  const { t } = useTranslation('purchase')
  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-4 font-bold">{t('savedWallets')}</legend>
        <Select
          aria-label={t('savedWallets')}
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
          className="hidden tablet:block"
        >
          <option value="" disabled>
            {t('selectWallet')}
          </option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {t(wallet.name)} · {wallet.label}
            </option>
          ))}
        </Select>
        <div className="space-y-4 tablet:hidden">
          {wallets.map((wallet) => (
            <label
              key={wallet.id}
              className="flex min-h-23 cursor-pointer items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 has-checked:border-primary"
            >
              <input
                type="radio"
                name="saved-wallet"
                value={wallet.id}
                checked={selected === wallet.id}
                onChange={() => onSelect(wallet.id)}
                className={radioClassName}
              />
              <span className="min-w-0 text-sm">
                <strong className="block">{t(wallet.name)}</strong>
                <span className="block text-secondary wrap-anywhere">
                  {wallet.label}
                </span>
                <small className="text-secondary">
                  {t('network')}: {wallet.network}
                </small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-4 font-bold tablet:mx-auto">
          {t('walletNetwork')}
        </legend>
        <div className="space-y-4 tablet:space-y-3">
          {(['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const).map(
            (name, index) => (
              <label
                key={name}
                className="flex min-h-15 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 has-checked:border-primary tablet:min-h-11 tablet:rounded-sm tablet:bg-transparent tablet:py-1"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center tablet:size-6 rounded-full border border-primary text-xs font-bold text-primary"
                >
                  {['WC', 'M', 'C'][index]}
                </span>
                <span className="min-w-0 flex-1 text-sm wrap-anywhere">
                  {name}
                </span>
                <input
                  type="radio"
                  name="provider"
                  checked={provider === name}
                  onChange={() => onProviderChange(name)}
                  className={radioClassName}
                />
              </label>
            ),
          )}
        </div>
      </fieldset>
    </div>
  )
}
