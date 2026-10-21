import { http, HttpResponse } from 'msw'
import {
  profileUpdateRequestSchema,
  walletRequestSchema,
} from '@/schemas/api/account'
import { resourceIdSchema } from '@/schemas/api/common'
import { accountErrorCodes } from '@/schemas/account'
import { readDatabase, updateDatabase } from './database'
import { requireUser } from './auth'
import { accountDelay, saveWallet, updateProfile } from './account'
import { jsonBody, MockError, parseInput, respond } from './responses'
import type { z } from 'zod'

const json = (data: Parameters<typeof HttpResponse.json>[0]) =>
  HttpResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
function parseAccount<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const fields = Object.fromEntries(
    result.error.issues.map((issue) => [
      String(issue.path.at(-1) ?? 'body'),
      accountErrorCodes.some((code) => code === issue.message)
        ? issue.message
        : 'invalid',
    ]),
  )
  throw new MockError('VALIDATION', 422, fields)
}
export const accountHandlers = [
  http.get('/api/profile', ({ request }) =>
    respond(async () => {
      await accountDelay(request)
      const database = await readDatabase()
      const { user } = requireUser(database, request)
      return json(database.profiles.find((profile) => profile.id === user.id)!)
    }),
  ),
  http.patch('/api/profile', ({ request }) =>
    respond(async () => {
      await accountDelay(request, true)
      const input = parseAccount(
        profileUpdateRequestSchema,
        await jsonBody(request),
      )
      return json(await updateProfile(request, input))
    }),
  ),
  http.get('/api/wallets', ({ request }) =>
    respond(async () => {
      await accountDelay(request)
      const database = await readDatabase()
      const { user } = requireUser(database, request)
      return json(
        database.wallets.filter((wallet) => wallet.userId === user.id),
      )
    }),
  ),
  http.post('/api/wallets', ({ request }) =>
    respond(async () => {
      await accountDelay(request, true)
      const input = parseAccount(walletRequestSchema, await jsonBody(request))
      return json(
        await updateDatabase((database) =>
          saveWallet(database, request, input),
        ),
      )
    }),
  ),
  http.patch('/api/wallets/:id', ({ request, params }) =>
    respond(async () => {
      await accountDelay(request, true)
      const id = parseInput(resourceIdSchema, params.id)
      const input = parseAccount(walletRequestSchema, await jsonBody(request))
      return json(
        await updateDatabase((database) =>
          saveWallet(database, request, input, id),
        ),
      )
    }),
  ),
]
