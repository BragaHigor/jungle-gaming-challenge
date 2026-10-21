import axios from 'axios'
import { z } from 'zod'
import { apiErrorSchema, type ApiErrorCode } from '@/schemas/api/common'

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | 'CONTRACT' | 'NETWORK' | 'TIMEOUT',
    public status = 0,
    public fields?: Record<string, string>,
  ) {
    super(code)
    this.name = 'ApiError'
  }
}
export const client = axios.create({
  baseURL: '/api',
  timeout: 3000,
  headers: { Accept: 'application/json' },
})
client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    if (axios.isCancel(error)) return Promise.reject(error)
    const payload = apiErrorSchema.safeParse(error.response?.data)
    if (payload.success)
      return Promise.reject(
        new ApiError(
          payload.data.error.code,
          error.response?.status,
          payload.data.error.fields,
        ),
      )
    if (error.response)
      return Promise.reject(new ApiError('CONTRACT', error.response.status))
    const code = error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK'
    return Promise.reject(new ApiError(code))
  },
)
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new ApiError('CONTRACT')
  return result.data
}
export const authorization = (token: string) => ({
  Authorization: `Bearer ${token}`,
})
