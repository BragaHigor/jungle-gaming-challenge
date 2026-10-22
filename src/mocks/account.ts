import { delay } from 'msw'
import { readDatabase, updateDatabase, type Database } from './database'
import { hashPassword, requireUser } from './auth'
import { MockError } from './responses'
import type { ProfileUpdate, WalletWrite } from '@/schemas/api/account'

export async function accountDelay(request: Request, write = false) {
  const snapshot = await readDatabase()
  const session = requireUser(snapshot, request)
  const fault = snapshot.accountFaults[session.user.id]
  await delay(fault === 'slow' ? 1200 : 150)
  const database = await readDatabase()
  if (database.generation !== snapshot.generation)
    throw new MockError('SCENARIO_RESET', 409)
  requireUser(database, request)
  if (
    (!write && fault === 'read-failure') ||
    (write && fault === 'write-failure')
  )
    throw new MockError('UNAVAILABLE', 503)
  if (write && fault === 'validation')
    throw new MockError('VALIDATION', 422, { email: 'emailTaken' })
}

export async function updateProfile(request: Request, input: ProfileUpdate) {
  const snapshot = await readDatabase()
  const session = requireUser(snapshot, request)
  const stored = snapshot.users.find((user) => user.id === session.user.id)!
  let passwordHash: string | undefined
  let salt: string | undefined
  if (input.newPassword) {
    if (
      (await hashPassword(input.currentPassword, stored.salt)) !==
      stored.passwordHash
    )
      throw new MockError('VALIDATION', 422, {
        currentPassword: 'currentPasswordInvalid',
      })
    salt = crypto.randomUUID().replaceAll('-', '')
    passwordHash = await hashPassword(input.newPassword, salt)
  }
  return updateDatabase((database) => {
    if (database.generation !== snapshot.generation)
      throw new MockError('SCENARIO_RESET', 409)
    const active = requireUser(database, request)
    const profile = database.profiles.find(
      (value) => value.id === active.user.id,
    )!
    const user = database.users.find((value) => value.id === active.user.id)!
    if (
      profile.version !== input.version ||
      user.passwordHash !== stored.passwordHash
    )
      throw new MockError('CONFLICT', 409)
    const fields: Record<string, string> = {}
    if (
      database.users.some(
        (other) =>
          other.id !== user.id &&
          other.email.toLowerCase() === input.email.toLowerCase(),
      )
    )
      fields.email = 'emailTaken'
    if (
      database.users.some(
        (other) =>
          other.id !== user.id &&
          other.username.toLowerCase() === input.username.toLowerCase(),
      )
    )
      fields.username = 'usernameTaken'
    if (Object.keys(fields).length) throw new MockError('CONFLICT', 409, fields)
    const identity = {
      displayName: input.displayName,
      username: input.username,
      email: input.email.toLowerCase(),
    }
    Object.assign(profile, identity, {
      ens: input.ens,
      walletNickname: input.walletNickname,
      avatar: input.avatar,
      version: profile.version + 1,
    })
    Object.assign(user, identity)
    if (passwordHash && salt) {
      Object.assign(user, { passwordHash, salt })
      database.sessions = database.sessions.filter(
        (value) => value.userId !== user.id || value.token === active.token,
      )
    }
    return profile
  })
}

export function saveWallet(
  database: Database,
  request: Request,
  input: WalletWrite,
  id?: string,
) {
  const { user } = requireUser(database, request)
  const current = id
    ? database.wallets.find((wallet) => wallet.id === id)
    : undefined
  if (id && !current) throw new MockError('NOT_FOUND', 404)
  if (current && current.userId !== user.id)
    throw new MockError('FORBIDDEN', 403)
  if (
    current &&
    (input.version !== current.version || current.primary !== input.primary)
  )
    throw new MockError('CONFLICT', 409)
  const own = database.wallets.filter((wallet) => wallet.userId === user.id)
  if (!current && own.some((wallet) => wallet.primary === input.primary))
    throw new MockError('CONFLICT', 409)
  const primary = own.find((wallet) => wallet.primary)
  if (!input.primary && !primary)
    throw new MockError('VALIDATION', 422, { address: 'primaryRequired' })
  const duplicate = own.some(
    (wallet) =>
      wallet.id !== id &&
      wallet.draft.network === input.draft.network &&
      (input.draft.network === 'Solana'
        ? wallet.draft.address === input.draft.address
        : wallet.draft.address.toLowerCase() ===
          input.draft.address.toLowerCase()),
  )
  if (duplicate)
    throw new MockError('CONFLICT', 409, { address: 'walletDuplicate' })
  const wallet = {
    id: current?.id ?? crypto.randomUUID(),
    userId: user.id,
    primary: input.primary,
    sameAsPrimary: input.primary && input.sameAsPrimary,
    label: input.draft.walletNickname,
    draft: input.draft,
    version: (current?.version ?? 0) + 1,
  }
  if (current) Object.assign(current, wallet)
  else database.wallets.push(wallet)
  if (!input.primary && primary?.sameAsPrimary) {
    primary.sameAsPrimary = false
    primary.version++
  }
  return database.wallets.filter((value) => value.userId === user.id)
}
