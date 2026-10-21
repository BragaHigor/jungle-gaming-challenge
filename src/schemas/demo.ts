import { z } from 'zod'
import { sessionSchema } from './api/account'
import { resourceIdSchema } from './api/common'

export const scenarios = [
  'default',
  'empty',
  'sold-out',
  'slow',
  'variable-latency',
  'offline',
  'timeout',
  'server-error',
  'unauthorized',
  'forbidden',
  'malformed-response',
  'malformed-event',
  'pending-order',
  'session-expired',
  'favorites-failure',
  'favorites-ready',
  'cart-empty',
  'coupon-invalid',
  'coupon-expired',
  'quote-failure',
  'cart-price-change',
  'cart-stock-change',
  'cart-ready',
  'cart-slow',
] as const
export const scenarioSchema = z.enum(scenarios)
export const demoRequestSchema = z.strictObject({ scenario: scenarioSchema })
export const demoEventRequestSchema = z.strictObject({
  type: z.enum(['nft.updated', 'order.updated']),
})
export const demoStatusSchema = z.strictObject({
  scenario: scenarioSchema,
  generation: z.uuid(),
  session: sessionSchema.nullable(),
  pendingOrderId: resourceIdSchema.nullable(),
})
export type Scenario = z.infer<typeof scenarioSchema>
export type DemoStatus = z.infer<typeof demoStatusSchema>
