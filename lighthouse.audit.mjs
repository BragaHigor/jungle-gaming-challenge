import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, appendFile, rm } from 'node:fs/promises'
import os from 'node:os'
import { chromium } from '@playwright/test'

const origin = 'http://127.0.0.1:4173'
const directory = 'reports/lighthouse'
const pages = { home: '/', detail: '/nfts/emerald-ape-042' }
const targets = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
}
const median = (values) => [...values].sort((a, b) => a - b)[1]

async function verifyApp() {
  const browser = await chromium.launch()
  try {
    for (const path of Object.values(pages)) {
      const context = await browser.newContext({ locale: 'pt-BR' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`${origin}${path}`)
      await page.locator('.site-layout').waitFor()
      await page
        .locator('.nft-card img, .nft-gallery__main img')
        .first()
        .waitFor()
      await page
        .locator('.nft-card img, .nft-gallery__main img')
        .first()
        .evaluate((image) => image.decode())
      const valid = await page.evaluate(async () => {
        const { document } = globalThis
        await document.fonts.ready
        const status = await fetch('/api/demo').then((response) =>
          response.json(),
        )
        return (
          document.documentElement.lang === 'pt-BR' &&
          status.scenario === 'default' &&
          document.fonts.check('16px "Roboto Mono"')
        )
      })
      if (!valid || errors.length)
        throw new Error(`Aplicação inválida em ${path}: ${errors.join(', ')}`)
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

function run(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      stdio: 'inherit',
      timeout: 180_000,
      ...options,
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${file} terminou: ${signal ?? code}`))
    })
  })
}

await mkdir(directory, { recursive: true })
const deployment = JSON.parse(await readFile('dist/deployment.json', 'utf8'))
if (!deployment.mocksEnabled)
  throw new Error('As auditorias exigem mocks ativos.')
await Promise.all(
  ['summary.json', 'summary.md', 'error.json'].map((file) =>
    rm(`${directory}/${file}`, { force: true }),
  ),
)
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
    '--strictPort',
  ],
  { stdio: 'inherit' },
)
let serverError
server.once('error', (error) => {
  serverError = error
})
server.once('exit', (code) => {
  serverError = new Error(`Preview terminou: ${code}`)
})
const results = []
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverError) throw serverError
    try {
      ready = (await fetch(`${origin}/deployment.json`)).ok
    } catch {
      ready = false
    }
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  if (!ready) throw new Error('Preview não iniciou.')
  await verifyApp()
  for (const [page, path] of Object.entries(pages)) {
    for (const profile of ['mobile', 'desktop']) {
      const runs = []
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (serverError) throw serverError
        const output = `${directory}/${page}-${profile}-${attempt}`
        const args = [
          `${origin}${path}`,
          '--config-path=./lighthouse.config.js',
          '--output=html',
          '--output=json',
          `--output-path=${output}`,
          '--chrome-flags=--headless --no-sandbox',
          '--quiet',
        ]
        await run('node_modules/lighthouse/cli/index.js', args, {
          env: {
            ...process.env,
            LIGHTHOUSE_PROFILE: profile,
            CHROME_PATH: chromium.executablePath(),
          },
        })
        const report = JSON.parse(
          await readFile(`${output}.report.json`, 'utf8'),
        )
        if (report.runtimeError)
          throw new Error(JSON.stringify(report.runtimeError))
        if (report.configSettings.formFactor !== profile)
          throw new Error(`Perfil incorreto: ${profile}`)
        if (
          Object.keys(targets).some(
            (category) => !Number.isFinite(report.categories[category]?.score),
          )
        )
          throw new Error('Auditoria sem pontuação válida.')
        if (new URL(report.finalDisplayedUrl).pathname !== path)
          throw new Error('A auditoria foi redirecionada para outra página.')
        runs.push(report)
        console.log(
          `${page}/${profile}/${attempt}: ${Object.values(report.categories)
            .map((category) => `${category.id}=${category.score * 100}`)
            .join(' ')}`,
        )
      }
      results.push({
        page,
        profile,
        url: `${origin}${path}`,
        categories: Object.fromEntries(
          Object.keys(targets).map((category) => [
            category,
            median(runs.map((run) => run.categories[category].score * 100)),
          ]),
        ),
        metrics: Object.fromEntries(
          [
            'largest-contentful-paint',
            'cumulative-layout-shift',
            'total-blocking-time',
          ].map((metric) => [
            metric,
            median(runs.map((run) => run.audits[metric].numericValue)),
          ]),
        ),
        environment: runs[0].environment,
        settings: runs[0].configSettings,
        lighthouseVersion: runs[0].lighthouseVersion,
        warnings: runs.map((run) => run.runWarnings),
      })
    }
  }
  const failures = results.flatMap((result) =>
    Object.entries(targets)
      .filter(([category, target]) => result.categories[category] < target)
      .map(
        ([category, target]) =>
          `${result.page}/${result.profile}: ${category} ${result.categories[category]} < ${target}`,
      ),
  )
  const summary = {
    timestamp: new Date().toISOString(),
    sha: process.env.GITHUB_SHA ?? 'local',
    node: process.version,
    npm: process.env.npm_config_user_agent,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
    memoryGiB: os.totalmem() / 1024 ** 3,
    targets,
    results,
    failures,
  }
  await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2))
  const markdown = [
    '| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...results.map(
      (result) =>
        `| ${result.page} | ${result.profile} | ${Object.values(result.categories).join(' | ')} | ${Object.values(
          result.metrics,
        )
          .map((value) => Math.round(value * 1000) / 1000)
          .join(' | ')} |`,
    ),
    '',
    ...failures,
  ].join('\n')
  await writeFile(`${directory}/summary.md`, markdown)
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown)
  console.log(markdown)
  if (failures.length) process.exitCode = 1
} catch (error) {
  await writeFile(
    `${directory}/error.json`,
    JSON.stringify({ message: String(error), completed: results }, null, 2),
  )
  throw error
} finally {
  server.kill()
}
