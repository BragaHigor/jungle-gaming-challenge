export function ethToWei(value: string): bigint {
  if (!/^\d+(?:\.\d{1,18})?$/.test(value)) throw new Error('Invalid ETH value')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
}

export function centiEth(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`
}

export function weiToEth(value: bigint): string {
  const whole = value / 10n ** 18n
  const fraction = String(value % 10n ** 18n)
    .padStart(18, '0')
    .replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : `${whole}`
}
