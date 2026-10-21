import { z } from 'zod'
import { scenarioSchema, type Scenario, type DemoStatus } from '@/schemas/demo'
import { nftSchema } from '@/schemas/api/catalog'
import {
  profileResponseSchema,
  savedWalletSchema,
  userSchema,
} from '@/schemas/api/account'
import { cartSchema, orderSchema, quoteSchema } from '@/schemas/api/purchase'
import { homeCards } from './presentation'

const storageKey = 'kurio-mock-database-v1'
const sessionRecordSchema = z.strictObject({
  token: z.string(),
  userId: z.string(),
  expiresAt: z.iso.datetime(),
})
const storedUserSchema = userSchema.extend({
  passwordHash: z.string(),
  salt: z.string(),
  iterations: z.literal(100000),
})
export const databaseSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generation: z.uuid(),
  scenario: scenarioSchema,
  nfts: z.array(nftSchema),
  users: z.array(storedUserSchema),
  profiles: z.array(profileResponseSchema),
  wallets: z.array(savedWalletSchema),
  carts: z.array(cartSchema),
  quotes: z.array(quoteSchema),
  orders: z.array(orderSchema),
  favorites: z.record(z.string(), z.array(z.string())),
  favoriteVersions: z.record(z.string(), z.int().positive()).default({}),
  favoriteFailures: z.array(z.string()).default([]),
  sessions: z.array(sessionRecordSchema),
  idempotency: z.record(
    z.string(),
    z.strictObject({
      userId: z.string(),
      fingerprint: z.string(),
      orderId: z.string(),
    }),
  ),
  coupons: z.array(
    z.strictObject({
      code: z.string(),
      percent: z.int().min(0).max(100),
      expiresAt: z.iso.datetime(),
    }),
  ),
})
export type Database = z.infer<typeof databaseSchema>
const users = [
  {
    id: 'collector-a',
    username: 'colecionador',
    displayName: 'Colecionador',
    email: 'colecionador@kurio.demo',
    salt: '00112233445566778899aabbccddeeff',
    passwordHash:
      '8a3785910764f20fd3b69ffc2ac51c72bfa3015a9bbe8f56b49f69485e24d0bf',
    iterations: 100000 as const,
  },
  {
    id: 'collector-b',
    username: 'visitante',
    displayName: 'Visitante',
    email: 'visitante@kurio.demo',
    salt: 'ffeeddccbbaa99887766554433221100',
    passwordHash:
      'be89548e544f18a6a65e8b121b775be7e295bd5d0c7a0fc199c06c6175641ee9',
    iterations: 100000 as const,
  },
]
export function createDatabase(scenario: Scenario = 'default'): Database {
  const nfts = homeCards.map((nft, index) => ({
    ...nft,
    publishedAt: new Date(Date.UTC(2026, 9, 20, 0, 36 - index)).toISOString(),
    version: 1,
    editions: [
      { id: '1/1' as const, available: 1, limit: 1 },
      { id: '1/10' as const, available: 10, limit: 10 },
      { id: '1/50' as const, available: 50, limit: 50 },
      { id: 'open' as const, available: 99, limit: 99 },
    ],
  }))
  if (scenario === 'sold-out') nfts[0].editions[2].available = 0
  const pending = scenario === 'pending-order'
  const date = '2026-10-21T00:00:00.000Z'
  if (pending) nfts[0].editions[2].available = 49
  const orders = pending
    ? [
        {
          id: 'order-demo-pending',
          userId: users[0].id,
          status: 'pending' as const,
          quoteId: 'quote-demo',
          walletId: 'wallet-a',
          network: 'Ethereum' as const,
          items: [
            {
              nft: nfts[0],
              editionId: '1/50' as const,
              quantity: 1,
              unitPrice: '1.19',
              subtotal: '1.19',
            },
          ],
          totals: {
            subtotal: '1.19',
            discount: '0',
            fee: '0.016',
            total: '1.206',
          },
          reference: null,
          version: 1,
          createdAt: date,
          updatedAt: date,
        },
      ]
    : []
  return databaseSchema.parse({
    schemaVersion: 1,
    generation: crypto.randomUUID(),
    scenario,
    nfts,
    users,
    profiles: users.map(({ id, username, displayName, email }) => ({
      id,
      username,
      displayName,
      email,
      ens: '',
      walletNickname: '',
      avatar: null,
      version: 1,
    })),
    wallets: pending
      ? [
          {
            id: 'wallet-a',
            userId: users[0].id,
            primary: true,
            label: 'Principal',
            version: 1,
            draft: {
              displayName: users[0].displayName,
              walletNickname: 'Principal',
              network: 'Ethereum',
              profileName: users[0].username,
              address: '0x1111111111111111111111111111111111111111',
              secondary: '',
              walletType: 'MetaMask',
              referral: 'DEMO',
              email: users[0].email,
              ens: 'colecionador.eth',
            },
          },
        ]
      : [],
    carts: [
      { id: 'visitor-cart', userId: null, items: [], version: 1 },
      ...users.map((user) => ({
        id: `cart-${user.id}`,
        userId: user.id,
        items: [],
        version: 1,
      })),
    ],
    quotes: orders.map((order) => ({
      id: order.quoteId,
      userId: order.userId,
      cartVersion: 1,
      items: order.items,
      totals: order.totals,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      version: 1,
    })),
    orders,
    sessions: pending
      ? users.map((user, index) => ({
          token:
            index === 0
              ? 'demo-pending-session-token'
              : 'demo-other-session-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }))
      : [],
    favorites: {},
    idempotency: {},
    coupons: [
      { code: 'KURIO10', percent: 10, expiresAt: '2030-01-01T00:00:00.000Z' },
    ],
  })
}
const databaseName = 'kurio-mocks'
const storeName = 'state'
const recordKey = 'database'
let connection: Promise<IDBDatabase> | undefined

function openStorage() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onerror = () => {
      connection = undefined
      reject(request.error)
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        connection = undefined
      }
      resolve(database)
    }
  })
  return connection
}
function readLegacyDatabase() {
  try {
    const stored = localStorage.getItem(storageKey)
    const parsed = databaseSchema.safeParse(stored ? JSON.parse(stored) : null)
    if (parsed.success) return parsed.data
  } catch {
    return createDatabase()
  }
  return createDatabase()
}
function removeLegacyDatabase() {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    return
  }
}
async function transaction<T>(
  action: (database: Database) => T,
  write = true,
): Promise<T> {
  const storage = await openStorage()
  return new Promise<T>((resolve, reject) => {
    const operation = storage.transaction(storeName, 'readwrite')
    const store = operation.objectStore(storeName)
    const request = store.get(recordKey)
    let result: T
    let failure: unknown
    request.onsuccess = () => {
      try {
        const parsed = databaseSchema.safeParse(request.result)
        const database = parsed.success ? parsed.data : readLegacyDatabase()
        result = action(database)
        if (write || !parsed.success)
          store.put(databaseSchema.parse(database), recordKey)
      } catch (error) {
        failure = error
        operation.abort()
      }
    }
    operation.oncomplete = () => {
      removeLegacyDatabase()
      resolve(result)
    }
    operation.onabort = () =>
      reject(
        failure ?? operation.error ?? new Error('Mock transaction aborted'),
      )
    operation.onerror = () => reject(operation.error)
  })
}
export function readDatabase(): Promise<Database> {
  return transaction((database) => database, false)
}
export function updateDatabase<T>(
  change: (database: Database) => T,
): Promise<T> {
  return transaction(change)
}
export function resetDatabase(scenario: Scenario) {
  return transaction((database) => {
    const fresh = createDatabase(scenario)
    Object.assign(database, fresh)
    return statusFromDatabase(fresh)
  })
}
export function getSession(database: Database, token?: string | null) {
  const session = database.sessions.find(
    (value) =>
      value.token === token && Date.parse(value.expiresAt) > Date.now(),
  )
  const user = database.users.find((value) => value.id === session?.userId)
  if (!session || !user) return null
  const { id, username, displayName, email } = user
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id, username, displayName, email },
  }
}
function statusFromDatabase(
  database: Database,
  token?: string | null,
): DemoStatus {
  const session = getSession(database, token)
  return {
    scenario: database.scenario,
    generation: database.generation,
    session,
    pendingOrderId:
      database.orders.find((order) => order.userId === session?.user.id)?.id ??
      null,
  }
}

export async function getDemoStatus(
  token?: string | null,
): Promise<DemoStatus> {
  return statusFromDatabase(await readDatabase(), token)
}
