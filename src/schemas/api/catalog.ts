import { z } from 'zod'
import { categories, networks } from '@/constants/catalog'
import { ethToWei } from '@/utils/eth'
import {
  ethSchema,
  quantitySchema,
  resourceIdSchema,
  versionSchema,
} from './common'

export const editionIdSchema = z.enum(['1/1', '1/10', '1/50', 'open'])
export const editionSchema = z
  .strictObject({
    id: editionIdSchema,
    available: z.int().min(0).max(99),
    limit: quantitySchema,
  })
  .refine((edition) => edition.available <= edition.limit, {
    path: ['available'],
  })
export const nftSchema = z.strictObject({
  id: resourceIdSchema,
  title: z.string().min(1).max(120),
  image: z.string().regex(/^\/images\/[a-zA-Z0-9._-]+\.webp$/),
  imageAltKey: z.enum(['emeraldAlt', 'sageAlt', 'neonAlt', 'goldenAlt']),
  price: ethSchema,
  previousPrice: ethSchema.optional(),
  rare: z.boolean().optional(),
  category: z.enum(categories),
  network: z.enum(networks),
  isNew: z.boolean(),
  hot: z.boolean(),
  token: resourceIdSchema,
  editions: z
    .array(editionSchema)
    .min(1)
    .max(4)
    .refine(
      (editions) =>
        new Set(editions.map((edition) => edition.id)).size === editions.length,
    ),
  version: versionSchema,
  publishedAt: z.iso.datetime(),
})
export const catalogQuerySchema = z
  .strictObject({
    q: z.string().trim().max(120).default(''),
    categories: z.array(z.enum(categories)).max(9).default([]),
    networks: z.array(z.enum(networks)).max(3).default([]),
    min: ethSchema.optional(),
    max: ethSchema.optional(),
    tab: z.enum(['all', 'new', 'hot']).default('all'),
    sort: z.enum(['recent', 'lowest', 'highest', 'name']).default('recent'),
    page: z.int().min(1).max(1000).default(1),
    pageSize: z.int().min(1).max(36).default(9),
  })
  .refine(
    (value) =>
      !value.min || !value.max || ethToWei(value.min) <= ethToWei(value.max),
    { path: ['min'] },
  )
export const catalogResponseSchema = z.strictObject({
  items: z.array(nftSchema),
  total: z.int().min(0),
  page: z.int().positive(),
  pageSize: z.int().positive(),
})
export type Nft = z.infer<typeof nftSchema>
export type CatalogQuery = z.input<typeof catalogQuerySchema>
