import { afterEach, expect, it, vi } from 'vitest'
import { checkPaddleResources, PADDLE_FILES } from './resources'
afterEach(() => vi.unstubAllGlobals())
it('rejects HTTP failure instead of claiming models are available', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
  await expect(checkPaddleResources()).rejects.toThrow('ocr:prepare')
})
it('rejects HTML SPA fallback and incomplete manifest', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('HTML') } })
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
  vi.stubGlobal('fetch', fetchMock)
  await expect(checkPaddleResources()).rejects.toThrow('ocr:prepare')
  await expect(checkPaddleResources()).rejects.toThrow('ocr:prepare')
})
it('requires all local model and WASM receipts', async () => {
  const receipts = PADDLE_FILES.map((file) => ({ file, bytes: 42, sha256: 'a'.repeat(64) }))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => receipts }))
  expect(await checkPaddleResources()).toEqual(receipts)
})

it('refuses to cache corrupt asset bytes even when HTTP returns 200', async () => {
  const { cachePaddleResources } = await import('./resources')
  const receipts = PADDLE_FILES.map((file) => ({ file, bytes: 3, sha256: 'a'.repeat(64) }))
  const cache = { delete: vi.fn(), put: vi.fn() }
  vi.stubGlobal('caches', { open: async () => cache })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(receipts)))
    .mockResolvedValue(new Response('bad')))
  await expect(cachePaddleResources()).rejects.toThrow('incompleto ou alterado')
  expect(cache.delete).toHaveBeenCalledWith('/ocr-paddle.local/PP-OCRv6_tiny_det.tar')
  expect(cache.put).not.toHaveBeenCalled()
})

it('caches all verified resources and the manifest', async () => {
  const { cachePaddleResources } = await import('./resources')
  const bytes = new TextEncoder().encode('valid')
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) => n.toString(16).padStart(2, '0')).join('')
  const receipts = PADDLE_FILES.map((file) => ({ file, bytes: bytes.byteLength, sha256: digest }))
  const cache = { delete: vi.fn(), put: vi.fn() }
  vi.stubGlobal('caches', { open: async () => cache })
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.endsWith('manifest.json') ? JSON.stringify(receipts) : bytes)))
  await cachePaddleResources()
  expect(cache.put).toHaveBeenCalledTimes(5)
  expect(cache.delete).not.toHaveBeenCalled()
})
