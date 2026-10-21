import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PurchaseHeader } from '@/components/purchase/PurchaseHeader'
import { PurchaseItems } from '@/components/purchase/PurchaseItems'
import { OrderSummary } from '@/components/purchase/OrderSummary'
import { CollectorFields } from '@/components/purchase/CollectorFields'
import { WalletSelection } from '@/components/purchase/WalletSelection'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UnavailableAction } from '@/components/UnavailableAction'
import {
  collectorSchema,
  type CollectorDraft,
  type CollectorErrors,
} from '@/schemas/collector'
import type { PurchaseItem, WalletOption } from '@/types/purchase'
import { presentationTotals } from '@/utils/purchase'

export function CheckoutPage({
  items,
  wallets,
}: {
  items: readonly PurchaseItem[]
  wallets: readonly WalletOption[]
}) {
  const { t } = useTranslation('purchase')
  const [draft, setDraft] = useState<CollectorDraft>({
    displayName: '',
    username: '',
    network: wallets[0]?.network ?? 'Ethereum',
    profileName: '',
    address: wallets[0]?.address ?? '',
    secondary: '',
    walletType: 'Coinbase Wallet',
    referral: '',
    email: '',
    ens: '',
    note: '',
  })
  const [errors, setErrors] = useState<CollectorErrors>({})
  const [selected, setSelected] = useState(wallets[0]?.id ?? '')
  const [otherWallet, setOtherWallet] = useState(false)
  const [review, setReview] = useState(false)
  const fields = useRef<HTMLDetailsElement>(null)
  const reviewButton = useRef<HTMLButtonElement>(null)
  const totals = presentationTotals(items)
  function change(key: keyof CollectorDraft, value: string) {
    if (key === 'address' || key === 'network') {
      setSelected('')
      setOtherWallet(true)
    }
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const handleOtherWalletChange = (checked: boolean) => {
    setOtherWallet(checked)
    if (checked) {
      setSelected('')
      setDraft((current) => ({ ...current, address: '' }))
      return
    }
    const defaultWallet = wallets[0]
    setSelected(defaultWallet?.id ?? '')
    setDraft((current) => ({
      ...current,
      address: defaultWallet?.address ?? '',
      network: defaultWallet?.network ?? 'Ethereum',
    }))
  }
  const handleWalletSelection = (id: string) => {
    const wallet = wallets.find((item) => item.id === id)
    if (!wallet) return
    setSelected(id)
    setOtherWallet(false)
    setDraft((current) => ({
      ...current,
      address: wallet.address,
      network: wallet.network,
    }))
    setErrors((current) => ({
      ...current,
      address: undefined,
      network: undefined,
    }))
  }
  const validationMessage = Object.values(errors).some(Boolean)
    ? t('fixFields')
    : ''
  function validate() {
    const result = collectorSchema.safeParse(draft)
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      )
      if (fields.current) {
        fields.current.open = true
        requestAnimationFrame(() =>
          fields.current
            ?.querySelector<HTMLElement>('[aria-invalid="true"]')
            ?.focus(),
        )
      }
      return
    }
    setErrors({})
    setReview(true)
  }
  return (
    <section>
      <PurchaseHeader checkout />
      {!items.length ? (
        <div className="py-16 text-center">
          <h2 className="mb-6 text-xl">{t('empty')}</h2>
          <Button asChild>
            <Link to="/">{t('continue')}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid items-start gap-10 desktop:grid-cols-[minmax(0,1fr)_405px] desktop:gap-8">
            <details
              ref={fields}
              open
              className="order-2 min-w-0 rounded-2xl border border-border p-4 tablet:order-1 tablet:rounded-none tablet:border-0 tablet:p-0"
            >
              <summary className="min-h-11 cursor-pointer content-center font-bold tablet:hidden">
                {t('collector')}
              </summary>
              <h2 className="mb-5 hidden text-lg font-bold tablet:block">
                {t('collector')}
              </h2>
              <CollectorFields
                value={draft}
                errors={errors}
                onChange={change}
                otherWallet={otherWallet}
                onOtherWalletChange={handleOtherWalletChange}
              />
            </details>
            <div className="order-1 min-w-0 space-y-7 tablet:order-2">
              <section className="hidden tablet:block" aria-label={t('items')}>
                <h2 className="mb-4 text-lg font-bold">{t('items')}</h2>
                <PurchaseItems items={items} />
                <OrderSummary totals={totals} coupon compact />
              </section>
              <WalletSelection
                provider={draft.walletType}
                onProviderChange={(value) => change('walletType', value)}
                selected={selected}
                wallets={wallets}
                onSelect={handleWalletSelection}
              />
              <div className="tablet:hidden">
                <details className="rounded-2xl border border-border p-4">
                  <summary className="min-h-11 cursor-pointer content-center text-sm font-bold">
                    {t('items')}
                  </summary>
                  <PurchaseItems items={items} />
                  <OrderSummary totals={totals} coupon compact />
                </details>
              </div>
              <div className="flex justify-end gap-5 font-bold tablet:hidden">
                <span>{t('total')}</span>
                <strong className="text-primary">{totals.total} ETH</strong>
              </div>
              <Button
                type="button"
                ref={reviewButton}
                onClick={validate}
                className="w-full max-tablet:min-h-15 max-tablet:rounded-full max-tablet:bg-[image:var(--gradient-copper)]"
              >
                {t('review')}
              </Button>
              <p role="status" className="text-sm text-destructive">
                {validationMessage}
              </p>
            </div>
          </div>
          <Dialog open={review} onOpenChange={setReview}>
            <DialogContent
              title={t('reviewTitle')}
              description={t('reviewDescription')}
              onCloseAutoFocus={(event) => {
                event.preventDefault()
                reviewButton.current?.focus()
              }}
            >
              <PurchaseItems items={items} />
              <dl className="space-y-2 text-sm wrap-anywhere">
                <div>
                  <dt className="text-secondary">{t('displayName')}</dt>
                  <dd>{draft.displayName}</dd>
                </div>
                <div>
                  <dt className="text-secondary">{t('address')}</dt>
                  <dd>{draft.address}</dd>
                </div>
                <div>
                  <dt className="text-secondary">{t('walletNetwork')}</dt>
                  <dd>
                    {draft.walletType} · {draft.network}
                  </dd>
                </div>
              </dl>
              <OrderSummary totals={totals} />
              <UnavailableAction className="min-h-11 rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground">
                {t('confirm')}
              </UnavailableAction>
            </DialogContent>
          </Dialog>
        </>
      )}
    </section>
  )
}
