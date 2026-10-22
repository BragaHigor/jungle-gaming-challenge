import { z } from 'zod'
import {
  loginSchema,
  registrationSchema,
  walletSchema,
  profileSchema,
} from '@/schemas/account'
import { avatarDataSchema } from '@/schemas/avatar'
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
  sameAsPrimary: z.boolean().default(false),
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

export const profileUpdateRequestSchema = profileSchema
  .safeExtend({
    avatar: avatarDataSchema.nullable(),
    version: versionSchema,
  })
  .strict()
export const walletRequestSchema = z.strictObject({
  draft: walletSchema,
  primary: z.boolean(),
  sameAsPrimary: z.boolean(),
  version: versionSchema.optional(),
})
export type Profile = z.infer<typeof profileResponseSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateRequestSchema>
export type SavedWallet = z.infer<typeof savedWalletSchema>
export type WalletWrite = z.infer<typeof walletRequestSchema>
export const favoriteRequestSchema = z.strictObject({ nftId: resourceIdSchema })
