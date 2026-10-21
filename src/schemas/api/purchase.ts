import { z } from 'zod'
import { ethToWei } from '@/utils/eth'
import { networks } from '@/constants/catalog'
import {
  ethSchema,
  quantitySchema,
  resourceIdSchema,
  versionSchema,
} from './common'
import { editionIdSchema, nftSchema } from './catalog'

export const cartItemRequestSchema = z.strictObject({
  nftId: resourceIdSchema,
  editionId: editionIdSchema,
  quantity: quantitySchema,
})
export const cartItemSchema = cartItemRequestSchema.extend({
  id: resourceIdSchema,
})
export const cartSchema = z.strictObject({
  id: resourceIdSchema,
  userId: resourceIdSchema.nullable(),
  items: z.array(cartItemSchema),
  version: versionSchema,
  coupon: z.string().max(40).nullable().default(null),
  mergeNotice: z.enum(['none', 'merged', 'partial']).default('none'),
})
export const totalsSchema = z
  .strictObject({
    subtotal: ethSchema,
    discount: ethSchema,
    fee: ethSchema,
    total: ethSchema,
  })
  .refine(
    (value) =>
      ethToWei(value.discount) <= ethToWei(value.subtotal) &&
      ethToWei(value.subtotal) -
        ethToWei(value.discount) +
        ethToWei(value.fee) ===
        ethToWei(value.total),
    { path: ['total'] },
  )
export const quoteRequestSchema = z.strictObject({
  cartVersion: versionSchema,
  walletId: resourceIdSchema,
  network: z.enum(networks),
  coupon: z.string().trim().max(40).optional(),
})
export const orderLineSchema = z
  .strictObject({
    nft: nftSchema,
    editionId: editionIdSchema,
    quantity: quantitySchema,
    unitPrice: ethSchema,
    subtotal: ethSchema,
  })
  .refine(
    (line) =>
      ethToWei(line.unitPrice) * BigInt(line.quantity) ===
      ethToWei(line.subtotal),
    { path: ['subtotal'] },
  )
const hasConsistentSubtotal = (value: {
  items: { subtotal: string }[]
  totals: { subtotal: string }
}) =>
  value.items.reduce((sum, item) => sum + ethToWei(item.subtotal), 0n) ===
  ethToWei(value.totals.subtotal)

export const quoteSchema = z
  .strictObject({
    id: resourceIdSchema,
    userId: resourceIdSchema.nullable(),
    cartId: resourceIdSchema.optional(),
    walletId: resourceIdSchema.nullable().default(null),
    network: z.enum(networks).default('Ethereum'),
    coupon: z.string().nullable().default(null),
    resourceVersions: z.record(z.string(), versionSchema).default({}),
    requiresReview: z.boolean().default(false),
    cartVersion: versionSchema,
    items: z.array(orderLineSchema).min(1),
    totals: totalsSchema,
    expiresAt: z.iso.datetime(),
    version: versionSchema,
  })
  .refine(hasConsistentSubtotal, { path: ['totals', 'subtotal'] })
export const orderRequestSchema = z.strictObject({
  quoteId: resourceIdSchema,
  walletId: resourceIdSchema,
})
export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[a-zA-Z0-9-]+$/)
export const orderSchema = z
  .strictObject({
    id: resourceIdSchema,
    userId: resourceIdSchema,
    status: z.enum(['pending', 'confirmed', 'declined']),
    quoteId: resourceIdSchema,
    walletId: resourceIdSchema,
    network: z.enum(networks),
    items: z.array(orderLineSchema).min(1),
    totals: totalsSchema,
    reference: z.string().max(120).nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    version: versionSchema,
  })
  .refine((order) => order.status !== 'confirmed' || Boolean(order.reference), {
    path: ['reference'],
  })
  .refine(hasConsistentSubtotal, { path: ['totals', 'subtotal'] })
export type Order = z.infer<typeof orderSchema>

export const cartQuantityRequestSchema = z.strictObject({
  cartVersion: versionSchema,
  quantity: quantitySchema,
})
export const couponRequestSchema = z.strictObject({
  cartVersion: versionSchema,
  code: z.string().trim().min(1).max(40),
})

export const cartVersionRequestSchema = z.strictObject({
  cartVersion: versionSchema,
})
export const cartPreviewRequestSchema = z.strictObject({
  cartVersion: versionSchema,
  resourceVersions: z.record(z.string(), versionSchema),
  network: z.enum(networks).default('Ethereum'),
})
export const cartResponseSchema = cartSchema.extend({
  lines: z.array(
    cartItemSchema.extend({
      nft: nftSchema,
      available: z.int().min(0).max(99),
    }),
  ),
  stockValid: z.boolean(),
})
export type Cart = z.infer<typeof cartSchema>
export type CartResponse = z.infer<typeof cartResponseSchema>
export type Quote = z.infer<typeof quoteSchema>
export type CartItemRequest = z.infer<typeof cartItemRequestSchema>
