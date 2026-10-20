import { z } from 'zod'

export const presentationSearchSchema = z.object({
  q: z.string().max(120).catch('').optional(),
  view: z
    .enum(['ready', 'loading', 'empty', 'error', 'unavailable'])
    .catch('ready')
    .optional(),
})
