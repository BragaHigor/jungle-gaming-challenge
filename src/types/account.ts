import type {
  AccountErrorCode,
  ProfileDraft,
  RegistrationDraft,
  WalletDraft,
} from '@/schemas/account'

export type AccountFieldName =
  keyof ProfileDraft | keyof RegistrationDraft | keyof WalletDraft
export type AccountValues = Partial<Record<AccountFieldName, string>>
export type AccountErrors = Partial<Record<AccountFieldName, AccountErrorCode>>
