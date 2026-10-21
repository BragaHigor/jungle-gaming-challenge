import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { realtimeHandler, closeConnections } from './realtime'
import { readDatabase } from './database'

const worker = setupWorker(...handlers, realtimeHandler)
export async function startMocks() {
  await readDatabase()
  await worker.start({
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith('/api/')) print.error()
    },
  })
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    closeConnections()
    worker.stop()
  })
