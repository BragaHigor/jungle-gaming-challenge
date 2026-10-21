import type { Page } from '@playwright/test'

export async function readMockStorage(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = indexedDB.open('kurio-mocks', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('state', 'readonly')
          const read = transaction.objectStore('state').get('database')
          transaction.oncomplete = () => {
            database.close()
            resolve(read.result)
          }
          transaction.onabort = () => {
            database.close()
            reject(transaction.error)
          }
        }
      }),
  )
}

export async function corruptMockStorage(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('kurio-mocks', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('state', 'readwrite')
          transaction.objectStore('state').put({ invalid: true }, 'database')
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.onabort = () => {
            database.close()
            reject(transaction.error)
          }
        }
      }),
  )
}
