import { z } from 'zod'

const required = z.string().trim().min(1, 'required').max(120, 'tooLong')
const ethereumAddress = /^0x[0-9a-fA-F]{40}$/
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const ensName = /^[\w-]+\.eth$/
export const collectorSchema = z
  .object({
    displayName: required,
    username: required.regex(/^[\w.-]+$/, 'usernameInvalid'),
    network: z.enum(['Ethereum', 'Polygon', 'Solana']),
    profileName: required,
    address: required,
    secondary: z
      .string()
      .trim()
      .max(120, 'tooLong')
      .refine(
        (value) =>
          !value ||
          ethereumAddress.test(value) ||
          solanaAddress.test(value) ||
          ensName.test(value),
        'secondaryInvalid',
      ),
    walletType: z.enum(['WalletConnect', 'MetaMask', 'Coinbase Wallet']),
    referral: z.string().trim().min(1, 'required').max(40, 'tooLong'),
    email: z.string().trim().pipe(z.email('emailInvalid')),
    ens: z
      .string()
      .trim()
      .min(1, 'required')
      .max(120, 'tooLong')
      .regex(ensName, 'ensInvalid'),
    note: z.string().max(500, 'tooLong'),
  })
  .refine(
    (value) =>
      (value.network === 'Solana' ? solanaAddress : ethereumAddress).test(
        value.address,
      ),
    { path: ['address'], error: 'addressInvalid' },
  )
export type CollectorDraft = z.infer<typeof collectorSchema>
export type CollectorErrors = Partial<Record<keyof CollectorDraft, string>>
