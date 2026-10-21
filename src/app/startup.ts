import { mocksEnabled } from '@/constants/environment'

export async function prepareApp() {
  if (!mocksEnabled) return
  const { startMocks } = await import('@/mocks/browser')
  await startMocks()
}
