export const PADDLE_ROOT = '/ocr-paddle.local/'
export const PADDLE_CACHE = 'messo-paddle-042-ort1243-v1'
export const PADDLE_FILES = ['PP-OCRv6_tiny_det.tar', 'PP-OCRv6_tiny_rec.tar', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
export const PADDLE_ASSETS = [...PADDLE_FILES, 'manifest.json'].map((file) => `${PADDLE_ROOT}${file}`)

export async function checkPaddleResources() {
  try {
    const response = await fetch(`${PADDLE_ROOT}manifest.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const receipts: unknown = await response.json()
    if (!Array.isArray(receipts) || PADDLE_FILES.some((file) => !receipts.some((item) =>
      item.file === file && Number.isFinite(item.bytes) && item.bytes > 0 && /^[a-f0-9]{64}$/.test(item.sha256),
    ))) throw new Error('Manifesto de recursos incompleto')
    return receipts as Array<{ file: string; bytes: number; sha256: string }>
  } catch {
    throw new Error('Recursos PaddleOCR ausentes ou incompatíveis. Execute npm run ocr:prepare e gere/publice novamente o build.')
  }
}

/** Validate resource digests before storing, avoiding HTML fallbacks and interrupted downloads. */
export async function cachePaddleResources() {
  const receipts = await checkPaddleResources()
  const cache = await caches.open(PADDLE_CACHE)
  for (const receipt of receipts) {
    if (!PADDLE_FILES.includes(receipt.file)) continue
    const url = `${PADDLE_ROOT}${receipt.file}`
    const response = await fetch(url)
    const bytes = await response.clone().arrayBuffer()
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) => n.toString(16).padStart(2, '0')).join('')
    if (!response.ok || bytes.byteLength !== receipt.bytes || digest !== receipt.sha256) {
      await cache.delete(url)
      throw new Error(`Recurso local incompleto ou alterado: ${receipt.file}. Limpe o cache experimental e prepare novamente os recursos.`)
    }
    await cache.put(url, response)
  }
  const response = await fetch(`${PADDLE_ROOT}manifest.json`)
  await cache.put(`${PADDLE_ROOT}manifest.json`, response)
}
