import { z } from 'zod'
import { resourceIdSchema, versionSchema } from './common'
import { nftSchema } from './catalog'
import { orderSchema } from './purchase'

const envelope = {
  eventId: z.uuid(),
  resourceId: resourceIdSchema,
  version: versionSchema,
  generation: z.uuid(),
}
export const nftUpdatedSchema = z
  .strictObject({
    ...envelope,
    type: z.literal('nft.updated'),
    data: nftSchema,
  })
  .refine(
    (event) =>
      event.resourceId === event.data.id &&
      event.version === event.data.version,
  )
export const orderUpdatedSchema = z
  .strictObject({
    ...envelope,
    type: z.literal('order.updated'),
    userId: resourceIdSchema,
    data: orderSchema,
  })
  .refine(
    (event) =>
      event.resourceId === event.data.id &&
      event.version === event.data.version &&
      event.userId === event.data.userId,
  )
export const resourceEventSchema = z.union([
  nftUpdatedSchema,
  orderUpdatedSchema,
])
export type ResourceEvent = z.infer<typeof resourceEventSchema>
