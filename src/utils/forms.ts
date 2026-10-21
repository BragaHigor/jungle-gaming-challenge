import { accountErrorCodes, type AccountErrorCode } from '@/schemas/account'
import type { AccountErrors, AccountFieldName } from '@/types/account'

export const focusFirstInvalid = (form: HTMLFormElement | null) => {
  requestAnimationFrame(() =>
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
  )
}

export const getAccountErrors = (
  issues: readonly { path: PropertyKey[]; message: string }[],
): AccountErrors => {
  const errors: AccountErrors = {}
  for (const issue of issues) {
    const field = issue.path[0] as AccountFieldName
    if (typeof field !== 'string' || errors[field]) continue
    const code = issue.message as AccountErrorCode
    errors[field] = accountErrorCodes.includes(code) ? code : 'invalid'
  }
  return errors
}
