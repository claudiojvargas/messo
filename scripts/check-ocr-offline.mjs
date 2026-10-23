import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
const base = process.env.OCR_BASE_URL || 'http://127.0.0.1:4173'
const profile = await mkdtemp(join(tmpdir(), 'messo-ocr-offline-'))
const options = { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }
const report = { generatedAt: new Date().toISOString(), platform: 'Chromium desktop; persistent profile, browser fully closed and relaunched with network offline before navigation. Not a Galaxy S23 validation.', externalRequests: [], offlineFailedRequests: [] }
let context
const observe = (ctx, offline = false) => {
  ctx.on('request', (r) => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== new URL(base).origin) report.externalRequests.push(r.url()) })
  if (offline) ctx.on('requestfailed', (r) => report.offlineFailedRequests.push({ url: r.url(), error: r.failure()?.errorText }))
}
async function recognize(page, engine, file) {
  await page.locator('#ocr-file').setInputFiles(fileURLToPath(new URL(`../tests/fixtures/ocr/${file}`, import.meta.url)))
  await page.locator('#ocr-engine').selectOption(engine)
  await page.locator('#ocr-run').click()
  await page.waitForFunction(() => /^(Leitura concluída|Falha técnica)/.test(document.querySelector('#ocr-status').textContent))
  const status = await page.locator('#ocr-status').textContent()
  assert(status.startsWith('Leitura concluída'), status)
  const output = JSON.parse(await page.locator('#ocr-output').textContent())
  assert(output.result.text.trim(), 'Recognition must produce text; this is availability, not accuracy scoring.')
  return { file, ...output }
}
try {
  context = await chromium.launchPersistentContext(profile, options)
  observe(context)
  let page = await context.newPage()
  page.setDefaultTimeout(120_000)
  const normalRequests = []
  page.on('request', (r) => normalRequests.push(r.url()))
  await page.goto(`${base}/app`)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  assert(!normalRequests.some((url) => /paddle-sdk|worker-entry|ocr-paddle\.local/.test(url)), 'Normal cart should not load Paddle resources')
  report.cartLoadsPaddle = false
  await page.goto(`${base}/app/ocr-lab`)
  await page.locator('#ocr-prepare').click()
  await page.waitForFunction(() => /^(Recursos armazenados|Falha técnica)/.test(document.querySelector('#ocr-status').textContent))
  assert((await page.locator('#ocr-status').textContent()).startsWith('Recursos armazenados'), await page.locator('#ocr-status').textContent())
  report.preparation = JSON.parse(await page.locator('#ocr-output').textContent())
  report.online = await recognize(page, 'paddle', 'etiqueta-01.jpg')
  await context.close(); context = undefined
  context = await chromium.launchPersistentContext(profile, options)
  await context.setOffline(true)
  observe(context, true)
  page = await context.newPage()
  page.setDefaultTimeout(120_000)
  await page.goto(`${base}/app/ocr-lab`)
  report.offlinePaddle = await recognize(page, 'paddle', 'etiqueta-03.jpg')
  report.offlineTesseract = await recognize(page, 'tesseract', 'etiqueta-03.jpg')
  assert.equal(report.externalRequests.length, 0, 'OCR must never request external resources')
  assert.equal(report.offlineFailedRequests.length, 0, 'Offline recognition must not rely on missing resources')
  report.status = 'passed'
  console.log('Offline restart: PaddleOCR and Tesseract recognized a different local image; no external or failed requests.')
} catch (error) {
  report.status = 'failed'; report.error = String(error); process.exitCode = 1; console.error(error)
} finally {
  if (context) await context.close()
  await writeFile('docs/issue-28-paddle-offline.json', JSON.stringify(report, null, 2) + '\n')
  await rm(profile, { recursive: true, force: true })
}
