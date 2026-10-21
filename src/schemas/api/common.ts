import { z } from 'zod'

export const resourceIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/)
export const versionSchema = z.int().positive()
export const ethSchema = z
  .string()
  .max(28)
  .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{0,17}[1-9])?$/)
export const quantitySchema = z.int().min(1).max(99)
export const errorCodes = [
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNAVAILABLE',
  'NOT_IMPLEMENTED',
  'SCENARIO_RESET',
  'STOCK_CHANGED',
  'CART_CHANGED',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
] as const
export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(errorCodes),
    fields: z.record(z.string(), z.string()).optional(),
  }),
})
export type ApiErrorCode = (typeof errorCodes)[number]
