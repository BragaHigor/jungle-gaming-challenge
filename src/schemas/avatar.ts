import { z } from 'zod'

export const avatarDataSchema = z
  .string()
  .max(2_800_000, 'avatarSize')
  .refine((value) => {
    const match =
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
    if (!match) return false
    try {
      const bytes = atob(match[2])
      if (bytes.length > 2 * 1024 * 1024) return false
      if (match[1] === 'png') return bytes.startsWith('\x89PNG\r\n\x1a\n')
      if (match[1] === 'jpeg') return bytes.startsWith('\xff\xd8\xff')
      return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
    } catch {
      return false
    }
  }, 'avatarInvalid')
