import { createWorker } from 'tesseract.js'
import type { OcrProgressListener, OcrResult } from './ocr-types'

const OCR_ASSET_ROOT = '/ocr'

type TesseractLogMessage = {
  status: string
  progress: number
}

let progressListener: OcrProgressListener | null = null
let workerPromise: ReturnType<typeof createWorker> | null = null
let recognitionQueue: Promise<void> = Promise.resolve()

function getWorker(): ReturnType<typeof createWorker> {
  if (!workerPromise) {
    progressListener?.({ stage: 'preparing' })
    workerPromise = createWorker('por', undefined, {
      workerPath: `${OCR_ASSET_ROOT}/worker.min.js`,
      corePath: `${OCR_ASSET_ROOT}/core`,
      langPath: `${OCR_ASSET_ROOT}/lang`,
      gzip: true,
      logger: (message: TesseractLogMessage) => {
        if (message.status === 'recognizing text') {
          progressListener?.({ stage: 'recognizing', progress: message.progress })
        }
      },
    }).catch((error: unknown) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

export async function recognizeImage(
  blob: Blob,
  onProgress?: OcrProgressListener,
): Promise<OcrResult> {
  let resolveTurn: (() => void) | undefined
  const previousTurn = recognitionQueue
  recognitionQueue = new Promise<void>((resolve) => {
    resolveTurn = resolve
  })

  await previousTurn
  progressListener = onProgress ?? null
  try {
    progressListener?.({ stage: 'preparing' })
    const worker = await getWorker()
    const result = await worker.recognize(blob)
    return { text: result.data.text, confidence: result.data.confidence }
  } finally {
    progressListener = null
    resolveTurn?.()
  }
}

export async function terminateOcr(): Promise<void> {
  const currentWorker = workerPromise
  workerPromise = null
  if (currentWorker) {
    const worker = await currentWorker.catch(() => null)
    await worker?.terminate()
  }
}

window.addEventListener('pagehide', () => {
  void terminateOcr()
})
