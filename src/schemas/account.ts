import { z } from 'zod'

export const accountErrorCodes = [
  'emailTaken',
  'usernameTaken',
  'required',
  'invalid',
  'emailInvalid',
  'usernameInvalid',
  'passwordInvalid',
  'passwordMismatch',
  'passwordUnchanged',
  'currentPasswordInvalid',
  'primaryRequired',
  'walletDuplicate',
  'ensInvalid',
  'addressInvalid',
  'secondaryInvalid',
  'avatarType',
  'avatarSize',
  'avatarInvalid',
] as const
export type AccountErrorCode = (typeof accountErrorCodes)[number]
const required = z.string().trim().min(1, 'required').max(120, 'invalid')
const email = z.string().trim().pipe(z.email('emailInvalid'))
const username = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9._-]{3,20}$/, 'usernameInvalid')
const password = z
  .string()
  .min(8, 'passwordInvalid')
  .max(128, 'passwordInvalid')
  .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'passwordInvalid')
const ens = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{3,63}\.eth$/i, 'ensInvalid')
const ethereumAddress = /^0x[0-9a-fA-F]{40}$/
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'required').max(128, 'invalid'),
})
export const registrationSchema = z
  .object({ username, email, password, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    error: 'passwordMismatch',
  })
export const profileSchema = z
  .object({
    displayName: required,
    username,
    email,
    ens,
    walletNickname: required,
    currentPassword: z.string().max(128, 'invalid'),
    newPassword: z.string().max(128, 'invalid'),
    confirmPassword: z.string(),
  })
  .superRefine((value, context) => {
    const changesPassword = Boolean(
      value.currentPassword || value.newPassword || value.confirmPassword,
    )
    if (!changesPassword) return
    if (!value.currentPassword)
      context.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'required',
      })
    if (!password.safeParse(value.newPassword).success)
      context.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'passwordInvalid',
      })
    if (value.newPassword && value.newPassword === value.currentPassword)
      context.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'passwordUnchanged',
      })
    if (value.newPassword !== value.confirmPassword)
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'passwordMismatch',
      })
  })
export const walletSchema = z
  .object({
    displayName: required,
    walletNickname: required,
    network: z.enum(['Ethereum', 'Polygon', 'Solana']),
    profileName: required,
    address: required,
    secondary: z
      .string()
      .trim()
      .max(120, 'invalid')
      .refine(
        (value) =>
          !value ||
          ethereumAddress.test(value) ||
          solanaAddress.test(value) ||
          ens.safeParse(value).success,
        'secondaryInvalid',
      ),
    walletType: z.enum(['WalletConnect', 'MetaMask', 'Coinbase Wallet']),
    referral: required,
    email,
    ens,
  })
  .refine(
    (value) =>
      (value.network === 'Solana' ? solanaAddress : ethereumAddress).test(
        value.address,
      ),
    { path: ['address'], error: 'addressInvalid' },
  )
export const avatarSchema = z.object({
  type: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    error: 'avatarType',
  }),
  size: z
    .number()
    .positive('avatarSize')
    .max(2 * 1024 * 1024, 'avatarSize'),
})
export type LoginDraft = z.infer<typeof loginSchema>
export type RegistrationDraft = z.infer<typeof registrationSchema>
export type ProfileDraft = z.infer<typeof profileSchema>
export type WalletDraft = z.infer<typeof walletSchema>
export type AccountViewState =
  'ready' | 'loading' | 'error' | 'signedOut' | 'expired'

export const authSearchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.enum(['expired']).optional(),
})
