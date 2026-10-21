import type { PurchaseItem, PurchaseTotals } from '@/types/purchase'
import { ethToWei, weiToEth } from './eth'

export function presentationTotals(
  items: readonly PurchaseItem[],
): PurchaseTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + ethToWei(item.nft.price) * BigInt(item.quantity),
    0n,
  )
  const fee = items.length ? '0.016' : '0'
  return {
    subtotal: weiToEth(subtotal),
    discount: '0',
    fee,
    total: weiToEth(subtotal + ethToWei(fee)),
  }
}
