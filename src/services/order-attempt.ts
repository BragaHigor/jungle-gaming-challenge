import { z } from 'zod'
import {
  idempotencyKeySchema,
  orderRequestSchema,
} from '@/schemas/api/purchase'
const attemptSchema = z.strictObject({
  key: idempotencyKeySchema,
  input: orderRequestSchema,
})
export type OrderAttempt = z.infer<typeof attemptSchema>
const storageKey = (userId: string) => `kurio-order-attempt:${userId}`
export function readOrderAttempt(userId: string) {
  try {
    const parsed = attemptSchema.safeParse(
      JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? 'null'),
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
export function saveOrderAttempt(userId: string, attempt: OrderAttempt | null) {
  if (attempt)
    sessionStorage.setItem(storageKey(userId), JSON.stringify(attempt))
  else sessionStorage.removeItem(storageKey(userId))
}
