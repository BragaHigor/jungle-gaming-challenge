import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PurchaseItems } from '@/components/purchase/PurchaseItems'
import { OrderSummary } from '@/components/purchase/OrderSummary'
import { CollectorFields } from '@/components/purchase/CollectorFields'
import { WalletSelection } from '@/components/purchase/WalletSelection'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCheckoutOrder } from '@/hooks/useCheckoutOrder'
import {
  collectorSchema,
  type CollectorDraft,
  type CollectorErrors,
} from '@/schemas/collector'
import type {
  PurchaseItem,
  PurchaseTotals,
  WalletOption,
} from '@/types/purchase'

export function CheckoutPage({
  items,
  wallets,
  totals,
  quoteReady = false,
  quoteLoading = false,
  quotedNetwork,
  quoteId,
  onNetworkChange,
}: {
  items: readonly PurchaseItem[]
  wallets: readonly WalletOption[]
  totals?: PurchaseTotals
  quoteReady?: boolean
  quoteLoading?: boolean
  quoteId?: string
  quotedNetwork?: WalletOption['network']
  onNetworkChange?: (network: WalletOption['network']) => void
}) {
  const { t } = useTranslation('purchase')
  const order = useCheckoutOrder()
  const [reviewedQuote, setReviewedQuote] = useState<string | undefined>()
  const [draft, setDraft] = useState<CollectorDraft>(
    order.attempt?.input.collector ?? {
      displayName: '',
      username: '',
      network: wallets[0]?.network ?? 'Ethereum',
      profileName: '',
      address: wallets[0]?.address ?? '',
      secondary: '',
      walletType: wallets[0]?.walletType ?? 'Coinbase Wallet',
      referral: '',
      email: '',
      ens: '',
      note: '',
    },
  )
  const [errors, setErrors] = useState<CollectorErrors>({})
  const [selected, setSelected] = useState(
    order.attempt?.input.walletId ?? wallets[0]?.id ?? '',
  )
  const lastSelected = useRef(
    order.attempt?.input.walletId ?? wallets[0]?.id ?? '',
  )
  const [otherWallet, setOtherWallet] = useState(
    order.attempt?.input.walletId === 'external',
  )
  const [review, setReview] = useState(false)
  const fields = useRef<HTMLDetailsElement>(null)
  const reviewButton = useRef<HTMLButtonElement>(null)
  const selectedWallet = wallets.find((wallet) => wallet.id === selected)
  const staleSelection =
    !otherWallet &&
    wallets.length > 0 &&
    (!selectedWallet ||
      selectedWallet.address !== draft.address ||
      selectedWallet.network !== draft.network)
  const canReview =
    quoteReady &&
    !staleSelection &&
    (!quotedNetwork || quotedNetwork === draft.network)
  useEffect(() => {
    onNetworkChange?.(draft.network)
  }, [draft.network, onNetworkChange])
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
      lastSelected.current = selected
      setSelected('')
      setDraft((current) => ({ ...current, address: '' }))
      return
    }
    const defaultWallet =
      wallets.find((wallet) => wallet.id === lastSelected.current) ?? wallets[0]
    setSelected(defaultWallet?.id ?? '')
    setDraft((current) => ({
      ...current,
      address: defaultWallet?.address ?? '',
      network: defaultWallet?.network ?? 'Ethereum',
      walletType: defaultWallet?.walletType ?? current.walletType,
    }))
    setErrors((current) => ({
      ...current,
      address: undefined,
      network: undefined,
      walletType: undefined,
    }))
  }
  const handleWalletSelection = (id: string) => {
    const wallet = wallets.find((item) => item.id === id)
    if (!wallet) return
    setSelected(id)
    lastSelected.current = id
    setOtherWallet(false)
    setDraft((current) => ({
      ...current,
      address: wallet.address,
      network: wallet.network,
      walletType: wallet.walletType ?? current.walletType,
    }))
    setErrors((current) => ({
      ...current,
      address: undefined,
      network: undefined,
      walletType: undefined,
    }))
  }
  const connection = order.connection.data
  const connected = Boolean(
    connection?.connected &&
    !order.disconnect.isPending &&
    connection.address === draft.address &&
    connection.network === draft.network &&
    connection.provider === draft.walletType &&
    connection.walletId === (otherWallet ? null : selected),
  )
  const connect = () =>
    order.connect({
      walletId: otherWallet ? null : selected,
      address: draft.address,
      network: draft.network,
      provider: draft.walletType,
    })
  const canConfirm =
    canReview &&
    connected &&
    reviewedQuote === quoteId &&
    !order.attempt &&
    !order.submission.isPending
  const validationMessage = Object.values(errors).some(Boolean)
    ? t('fixFields')
    : ''
  function validate() {
    if (!canReview || !totals) return
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
    setReviewedQuote(quoteId)
    setReview(true)
  }
  return (
    <section>
      {order.attempt && !review && (
        <div
          role="status"
          className="mb-6 space-y-3 rounded-lg border border-border bg-surface p-4 text-sm"
        >
          <p>{t('recoverAttempt')}</p>
          <Button disabled={order.submission.isPending} onClick={order.recover}>
            {t('recoverOrder')}
          </Button>
          <Button asChild variant="outline">
            <Link to="/confirmation" search={{ orderId: undefined }}>
              {t('checkOrders')}
            </Link>
          </Button>
        </div>
      )}
      {order.submission.isError && !review && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {t(order.attempt ? 'uncertainOrder' : 'orderChanged')}
        </p>
      )}
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
                <OrderSummary
                  totals={totals}
                  loading={quoteLoading}
                  coupon
                  compact
                />
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
                  <OrderSummary
                    totals={totals}
                    loading={quoteLoading}
                    coupon
                    compact
                  />
                </details>
              </div>
              <div className="flex justify-end gap-5 font-bold tablet:hidden">
                <span>{t('total')}</span>
                <strong className="text-primary">
                  {totals?.total ?? '—'} ETH
                </strong>
              </div>
              {staleSelection && (
                <div
                  role="alert"
                  className="space-y-2 text-sm text-destructive"
                >
                  <p>{t('walletSelectionChanged')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      handleWalletSelection(selectedWallet?.id ?? wallets[0].id)
                    }
                  >
                    {t('reloadWallet')}
                  </Button>
                </div>
              )}
              <Button
                type="button"
                ref={reviewButton}
                disabled={!canReview}
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
              <OrderSummary totals={totals} loading={quoteLoading} />
              {!canReview && (
                <div
                  role="alert"
                  className="space-y-2 text-sm text-destructive"
                >
                  <p>{t('returnToCart')}</p>
                  <Link
                    to="/cart"
                    className="inline-block min-h-11 content-center underline"
                  >
                    {t('backToCart')}
                  </Link>
                </div>
              )}
              <div className="space-y-3 text-sm">
                <p role="status">
                  {t(connected ? 'walletConnected' : 'walletDisconnected')}
                </p>
                {order.connection.isError && (
                  <p role="alert" className="text-destructive">
                    {t('connectionRefused')}
                  </p>
                )}
                {order.disconnect.isError && (
                  <p role="alert" className="text-destructive">
                    {t('disconnectFailed')}
                  </p>
                )}
                {connected ? (
                  <Button
                    variant="outline"
                    disabled={
                      order.submission.isPending || order.disconnect.isPending
                    }
                    onClick={() => order.disconnect.mutate(connection!.id)}
                  >
                    {t('disconnectWallet')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={
                      !canReview ||
                      order.connection.isPending ||
                      order.submission.isPending ||
                      Boolean(order.attempt)
                    }
                    onClick={connect}
                  >
                    {t(
                      order.connection.isPending
                        ? 'connectingWallet'
                        : 'connectWallet',
                    )}
                  </Button>
                )}
                {reviewedQuote !== quoteId && (
                  <p role="alert">{t('reviewChanged')}</p>
                )}
                <Button
                  disabled={!canConfirm}
                  onClick={() => {
                    if (!canConfirm || !connection || !quoteId) return
                    order.submit({
                      quoteId,
                      walletId: otherWallet ? 'external' : selected,
                      connectionId: connection.id,
                      collector: draft,
                    })
                  }}
                >
                  {t(order.submission.isPending ? 'sendingOrder' : 'confirm')}
                </Button>
                {order.submission.isError && (
                  <p role="alert" className="text-destructive">
                    {t(order.attempt ? 'uncertainOrder' : 'orderChanged')}
                  </p>
                )}
                {order.attempt && (
                  <Button
                    variant="outline"
                    disabled={order.submission.isPending}
                    onClick={order.recover}
                  >
                    {t('recoverOrder')}
                  </Button>
                )}
                {reviewedQuote !== quoteId && (
                  <Button variant="outline" onClick={() => setReview(false)}>
                    {t('reviewAgain')}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </section>
  )
}
