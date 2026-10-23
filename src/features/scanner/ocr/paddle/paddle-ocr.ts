import { adaptPaddleResult } from './adapter'

import { PADDLE_ROOT, checkPaddleResources } from './resources'
export { PADDLE_ASSETS } from './resources'

async function createEngine() {
  await checkPaddleResources()
  const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
  return PaddleOCR.create({
    worker: true,
    lang: 'pt', ocrVersion: 'PP-OCRv6',
    textDetectionModelName: 'PP-OCRv6_tiny_det',
    textRecognitionModelName: 'PP-OCRv6_tiny_rec',
    textDetectionModelAsset: { url: `${PADDLE_ROOT}PP-OCRv6_tiny_det.tar` },
    textRecognitionModelAsset: { url: `${PADDLE_ROOT}PP-OCRv6_tiny_rec.tar` },
    textDetectionBatchSize: 1, textRecognitionBatchSize: 1,
    ortOptions: { backend: 'wasm', wasmPaths: new URL(PADDLE_ROOT, location.origin).href, numThreads: 1, proxy: false },
  })
}
let engine: ReturnType<typeof createEngine> | undefined
let busy = false
export async function initializePaddle() {
  if (!engine) engine = createEngine().catch((error: unknown) => { engine = undefined; throw error })
  return engine
}
export async function recognizePaddle(blob: Blob) {
  if (busy) throw new Error('Aguarde a leitura atual terminar.')
  busy = true
  const start = performance.now()
  try {
    const instance = await initializePaddle()
    const [result] = await instance.predict(blob)
    if (!result) throw new Error('PaddleOCR não retornou resultado para a imagem.')
    return adaptPaddleResult(result, performance.now() - start)
  } finally { busy = false }
}
export async function disposePaddle() {
  if (busy) throw new Error('Aguarde a leitura atual terminar.')
  const current = engine
  engine = undefined
  if (current) await (await current).dispose()
}
