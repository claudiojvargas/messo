import { beforeEach, describe, expect, it, vi } from 'vitest'
const sdk = vi.hoisted(() => ({ create: vi.fn(), predict: vi.fn(), dispose: vi.fn() }))
vi.mock('@paddleocr/paddleocr-js', () => ({ PaddleOCR: { create: sdk.create } }))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('location', { origin: 'https://messo.test' })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ['PP-OCRv6_tiny_det.tar', 'PP-OCRv6_tiny_rec.tar', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'].map((file) => ({ file, bytes: 1, sha256: 'a'.repeat(64) })) }))
  sdk.create.mockResolvedValue({ predict: sdk.predict, dispose: sdk.dispose })
})
describe('experimental Paddle client', () => {
  it('loads only local model/WASM URLs in a single-thread dedicated worker and reuses initialization', async () => {
    const { initializePaddle, PADDLE_ASSETS } = await import('./paddle-ocr')
    await initializePaddle(); await initializePaddle()
    expect(sdk.create).toHaveBeenCalledTimes(1)
    expect(sdk.create).toHaveBeenCalledWith(expect.objectContaining({
      worker: true, lang: 'pt',
      textDetectionModelAsset: { url: '/ocr-paddle.local/PP-OCRv6_tiny_det.tar' },
      textRecognitionModelAsset: { url: '/ocr-paddle.local/PP-OCRv6_tiny_rec.tar' },
      ortOptions: expect.objectContaining({ numThreads: 1, backend: 'wasm', wasmPaths: 'https://messo.test/ocr-paddle.local/' }),
    }))
    expect(PADDLE_ASSETS.every((url) => url.startsWith('/ocr-paddle.local/'))).toBe(true)
  })
  it('allows retry after initialization error', async () => {
    sdk.create.mockRejectedValueOnce(new Error('HTTP 404'))
    const { initializePaddle } = await import('./paddle-ocr')
    await expect(initializePaddle()).rejects.toThrow('HTTP 404')
    await initializePaddle()
    expect(sdk.create).toHaveBeenCalledTimes(2)
  })
  it('distinguishes missing output from a valid empty recognition', async () => {
    const { recognizePaddle } = await import('./paddle-ocr')
    sdk.predict.mockResolvedValueOnce([])
    await expect(recognizePaddle(new Blob())).rejects.toThrow('não retornou resultado')
    sdk.predict.mockResolvedValueOnce([{ items: [] }])
    expect((await recognizePaddle(new Blob())).text).toBe('')
  })
  it('propagates inference errors and allows the next attempt', async () => {
    const { recognizePaddle } = await import('./paddle-ocr')
    sdk.predict.mockRejectedValueOnce(new Error('WASM memory'))
    await expect(recognizePaddle(new Blob())).rejects.toThrow('WASM memory')
    sdk.predict.mockResolvedValueOnce([{ items: [] }])
    await expect(recognizePaddle(new Blob())).resolves.toMatchObject({ text: '' })
  })
  it('disposes the worker and initializes a new one on demand', async () => {
    const { initializePaddle, disposePaddle } = await import('./paddle-ocr')
    await initializePaddle(); await disposePaddle(); await initializePaddle()
    expect(sdk.dispose).toHaveBeenCalledTimes(1)
    expect(sdk.create).toHaveBeenCalledTimes(2)
  })
})
