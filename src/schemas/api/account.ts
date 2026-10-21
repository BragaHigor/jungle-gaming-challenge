import { z } from 'zod'
import {
  loginSchema,
  registrationSchema,
  walletSchema,
  profileSchema,
} from '@/schemas/account'
import { resourceIdSchema, versionSchema } from './common'

export const loginRequestSchema = loginSchema.strict()
export const registrationRequestSchema = registrationSchema.strict()
export const userSchema = z.strictObject({
  id: resourceIdSchema,
  username: z.string().min(3).max(20),
  email: z.email(),
  displayName: z.string().min(1).max(120),
})
export const sessionSchema = z.strictObject({
  token: z.string().min(16).max(128),
  user: userSchema,
  expiresAt: z.iso.datetime(),
})
export const profileResponseSchema = userSchema.extend({
  ens: z.string().max(120),
  walletNickname: z.string().max(120),
  avatar: z.string().max(3_000_000).nullable(),
  version: versionSchema,
})
export const savedWalletSchema = z.strictObject({
  id: resourceIdSchema,
  userId: resourceIdSchema,
  primary: z.boolean(),
  label: z.string().min(1).max(120),
  draft: walletSchema,
  version: versionSchema,
})
export const walletsResponseSchema = z.array(savedWalletSchema)
export const favoritesSchema = z.strictObject({
  userId: resourceIdSchema,
  nftIds: z.array(resourceIdSchema),
  version: versionSchema,
})
export type PublicUser = z.infer<typeof userSchema>
export type Session = z.infer<typeof sessionSchema>

export const profileUpdateRequestSchema = profileSchema.strict()
export const walletRequestSchema = walletSchema.strict()
export const favoriteRequestSchema = z.strictObject({ nftId: resourceIdSchema })
