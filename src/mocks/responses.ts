import { HttpResponse } from 'msw'
import { z } from 'zod'
import { apiErrorSchema, type ApiErrorCode } from '@/schemas/api/common'

export class MockError extends Error {
  constructor(
    public code: ApiErrorCode,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(code)
  }
}
export function failure(
  code: ApiErrorCode,
  status: number,
  fields?: Record<string, string>,
) {
  return HttpResponse.json(apiErrorSchema.parse({ error: { code, fields } }), {
    status,
  })
}
export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success)
    throw new MockError(
      'VALIDATION',
      422,
      Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join('.') || 'body',
          'invalid',
        ]),
      ),
    )
  return result.data
}
export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new MockError('VALIDATION', 400)
  }
}
export async function respond(action: () => Response | Promise<Response>) {
  try {
    return await action()
  } catch (error) {
    if (error instanceof MockError)
      return failure(error.code, error.status, error.fields)
    return failure('UNAVAILABLE', 503)
  }
}
