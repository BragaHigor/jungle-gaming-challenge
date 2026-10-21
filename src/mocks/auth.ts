import {
  getSession,
  readDatabase,
  updateDatabase,
  type Database,
} from './database'
import { mergeVisitorCart } from './cart'
import { MockError } from './responses'
import type { RegistrationDraft } from '@/schemas/account'

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bytes = Uint8Array.from(salt.match(/../g)!, (pair) =>
    parseInt(pair, 16),
  )
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt: bytes },
    key,
    256,
  )
  return hex(new Uint8Array(hash))
}

function createSession(database: Database, userId: string) {
  const record = {
    token: crypto.randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  }
  database.sessions = database.sessions.filter(
    (session) => Date.parse(session.expiresAt) > Date.now(),
  )
  database.sessions.push(record)
  mergeVisitorCart(database, userId)
  return getSession(database, record.token)!
}

export async function login(email: string, password: string) {
  const snapshot = await readDatabase()
  const user = snapshot.users.find(
    (value) => value.email.toLowerCase() === email.toLowerCase(),
  )
  const hash = await hashPassword(
    password,
    user?.salt ?? '00000000000000000000000000000000',
  )
  if (!user || hash !== user.passwordHash)
    throw new MockError('UNAUTHORIZED', 401)
  return updateDatabase((database) => {
    if (database.generation !== snapshot.generation)
      throw new MockError('SCENARIO_RESET', 409)
    return createSession(database, user.id)
  })
}

export async function register(draft: RegistrationDraft) {
  const generation = (await readDatabase()).generation
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const passwordHash = await hashPassword(draft.password, salt)
  return updateDatabase((database) => {
    if (database.generation !== generation)
      throw new MockError('SCENARIO_RESET', 409)
    const fields: Record<string, string> = {}
    if (
      database.users.some(
        (user) => user.email.toLowerCase() === draft.email.toLowerCase(),
      )
    )
      fields.email = 'emailTaken'
    if (
      database.users.some(
        (user) => user.username.toLowerCase() === draft.username.toLowerCase(),
      )
    )
      fields.username = 'usernameTaken'
    if (Object.keys(fields).length) throw new MockError('CONFLICT', 409, fields)
    const user = {
      id: crypto.randomUUID(),
      username: draft.username,
      displayName: draft.username,
      email: draft.email.toLowerCase(),
      salt,
      passwordHash,
      iterations: 100000 as const,
    }
    database.users.push(user)
    database.profiles.push({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      ens: '',
      walletNickname: '',
      avatar: null,
      version: 1,
    })
    database.carts.push({
      id: `cart-${user.id}`,
      userId: user.id,
      items: [],
      version: 1,
      coupon: null,
      mergeNotice: 'none',
    })
    return createSession(database, user.id)
  })
}

export function requireUser(database: Database, request: Request) {
  const session = getSession(
    database,
    request.headers.get('Authorization')?.replace(/^Bearer /, ''),
  )
  if (!session) throw new MockError('UNAUTHORIZED', 401)
  return session
}
