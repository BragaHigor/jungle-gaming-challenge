import { delay, HttpResponse } from 'msw'
import { readDatabase } from './database'
import { failure } from './responses'

export async function readScenario(request: Request) {
  const initial = await readDatabase()
  const { scenario, generation } = initial
  const errors = {
    unauthorized: () => failure('UNAUTHORIZED', 401),
    forbidden: () => failure('FORBIDDEN', 403),
    'server-error': () => failure('UNAVAILABLE', 503),
    offline: () => HttpResponse.error(),
  }
  const error = errors[scenario as keyof typeof errors]
  if (error) return { database: initial, response: error() }
  const durations = {
    slow: 1200,
    timeout: 6000,
    'variable-latency': new URL(request.url).searchParams
      .get('q')
      ?.toLowerCase()
      .startsWith('em')
      ? 700
      : 40,
  }
  await delay(durations[scenario as keyof typeof durations] ?? 40)
  const database = await readDatabase()
  const response =
    database.generation !== generation
      ? failure('SCENARIO_RESET', 409)
      : undefined
  return { database, response }
}

export async function scenarioResponse(request: Request) {
  return (await readScenario(request)).response
}
