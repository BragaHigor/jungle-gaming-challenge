import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router'

const textFields = ['q', 'min', 'max'] as const

export function parseSearch(search: string): Record<string, unknown> {
  const parsed: Record<string, unknown> = { ...defaultParseSearch(search) }
  const params = new URLSearchParams(search)
  for (const field of textFields) {
    const value = params.get(field)
    if (value !== null) parsed[field] = value
  }
  return parsed
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams(defaultStringifySearch(search))
  for (const field of textFields) {
    const value = search[field]
    if (typeof value === 'string') params.set(field, value)
  }
  const value = params.toString()
  return value ? `?${value}` : ''
}
