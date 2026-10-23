import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const base = process.env.OCR_BASE_URL || 'http://127.0.0.1:4173'
const output = process.env.OCR_REPORT || 'docs/issue-28-paddle-results.json'
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium'
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext()
const page = await context.newPage()
const cdp = await browser.newBrowserCDPSession()
async function browserRss() {
  const { processInfo } = await cdp.send('SystemInfo.getProcessInfo')
  const processes = []
  for (const process of processInfo) {
    try {
      const status = await readFile(`/proc/${process.id}/status`, 'utf8')
      const kb = Number(status.match(/^VmRSS:\s+(\d+) kB/m)?.[1])
      if (Number.isFinite(kb)) processes.push({ type: process.type, rssBytes: kb * 1024 })
    } catch { /* process may already have exited */ }
  }
  return { totalBytes: processes.reduce((sum, process) => sum + process.rssBytes, 0), processes, limitation: 'Post-call sum of RSS for Chromium processes, including both resident engines and shared pages counted more than once; not peak, PSS, or isolated per-engine allocation.' }
}
page.setDefaultTimeout(120_000)
const externalRequests = new Set()
const errors = []
context.on('request', (request) => {
  if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) externalRequests.add(request.url())
})
page.on('pageerror', (error) => errors.push(error.message))
const report = {
  generatedAt: new Date().toISOString(), browser: browser.version(), platform: process.platform,
  protocol: 'Chromium desktop; each original JPEG is decoded with browser EXIF orientation and converted to lossless PNG at native dimensions, without crop or resizing, identically for both engines. One sequential pass; no warmup. elapsedMs includes lazy engine initialization on first use, excludes PNG preparation. JS heap is approximate main-thread heap, not total worker/WASM memory. Physical Android tests are not executed.',
  fixtures: [], externalRequests: [], errors,
}
try {
  await page.goto(`${base}/app/ocr-lab`)
  await page.waitForSelector('#ocr-run')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForSelector('#ocr-run')
  const references = JSON.parse(await readFile(new URL('../docs/ocr-reference.json', import.meta.url), 'utf8'))
  report.browserRssBeforeEngines = await browserRss()
  for (let number = 1; number <= 6; number++) {
    const file = `etiqueta-0${number}.jpg`
    const path = new URL(`../tests/fixtures/ocr/${file}`, import.meta.url)
    const bytes = await readFile(path)
    const entry = { file, sha256: createHash('sha256').update(bytes).digest('hex'), reference: references[file], outputs: [] }
    await page.locator('#ocr-file').setInputFiles(fileURLToPath(path))
    for (const engine of ['tesseract', 'paddle']) {
      await page.locator('#ocr-engine').selectOption(engine)
      await page.locator('#ocr-run').click()
      await page.waitForFunction(() => /^(Leitura concluída|Falha técnica)/.test(document.querySelector('#ocr-status').textContent))
      const text = await page.locator('#ocr-output').textContent()
      const status = await page.locator('#ocr-status').textContent()
      const reading = text ? JSON.parse(text) : { engine, status: 'technical-error', error: status, result: null }
      reading.browserRss = await browserRss()
      if (text && entry.reference) {
        const actual = [...new Set(reading.parsed.prices.map((p) => p.valueCents))]
        const expected = entry.reference
        reading.numericComparison = {
          purchaseValuesFound: expected.purchasePricesCents.filter((n) => actual.includes(n)),
          purchaseValuesMissing: expected.purchasePricesCents.filter((n) => !actual.includes(n)),
          referenceValuesFound: expected.referencePricesCents.filter((n) => actual.includes(n)),
          falseNumericCandidates: actual.filter((n) => ![...expected.purchasePricesCents, ...expected.referencePricesCents].includes(n)),
          limitation: 'Numeric matches alone do not establish correct price type, product, quantities or promotion conditions; inspect raw text and parsed fields.',
        }
      }
      entry.outputs.push(reading)
      console.log(file, engine, text ? `${reading.elapsedMs.toFixed(1)} ms` : status)
    }
    report.fixtures.push(entry)
    await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  }
  report.externalRequests = [...externalRequests]
} finally {
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  await browser.close()
}
// Fail when a required engine did not run; a report with technical errors is not a passing benchmark.
if (report.fixtures.length !== 6 || report.fixtures.some((f) => f.outputs.some((r) => r.status === 'technical-error'))) process.exitCode = 1
