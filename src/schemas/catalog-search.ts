import { z } from 'zod'
import { categories, networks } from '@/constants/catalog'
import { ethSchema } from './api/common'
import { ethToWei } from '@/utils/eth'

const list = <T extends string>(values: readonly [T, ...T[]]) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' ? value.split(',').filter(Boolean) : value,
    z
      .array(z.enum(values))
      .transform((items) => [...new Set(items)].sort())
      .optional()
      .catch(undefined),
  )

export const catalogSearchSchema = z
  .object({
    q: z.string().max(120).optional().catch(undefined),
    categories: list(categories),
    networks: list(networks),
    min: ethSchema.optional().catch(undefined),
    max: ethSchema.optional().catch(undefined),
    tab: z.enum(['all', 'new', 'hot']).optional().catch(undefined),
    sort: z
      .enum(['recent', 'lowest', 'highest', 'name'])
      .optional()
      .catch(undefined),
    page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
  })
  .transform((value) => {
    if (value.min && value.max && ethToWei(value.min) > ethToWei(value.max))
      return { ...value, min: undefined, max: undefined }
    return value
  })

export type CatalogSearch = z.output<typeof catalogSearchSchema>
