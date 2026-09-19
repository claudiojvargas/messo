import { createWorker } from 'tesseract.js'
import type { OcrLine, OcrProgressListener, OcrResult } from './ocr-types'

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
    // Tesseract.js 6 keeps non-text output disabled unless explicitly requested.
    const result = await worker.recognize(blob, {}, { blocks: true })
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      lines: readLines(result.data),
    }
  } finally {
    progressListener = null
    resolveTurn?.()
  }
}

function readLines(data: unknown): OcrLine[] | undefined {
  if (!isRecord(data) || !Array.isArray(data.blocks)) return undefined

  const lines: OcrLine[] = []
  for (const block of data.blocks) {
    if (!isRecord(block) || !Array.isArray(block.paragraphs)) continue
    for (const paragraph of block.paragraphs) {
      if (!isRecord(paragraph) || !Array.isArray(paragraph.lines)) continue
      for (const line of paragraph.lines) {
        const parsedLine = readLine(line)
        if (parsedLine) lines.push(parsedLine)
      }
    }
  }

  return lines.length > 0 ? lines : undefined
}

function readLine(value: unknown): OcrLine | null {
  if (!isRecord(value) || typeof value.text !== 'string' || !isBoundingBox(value.bbox)) return null
  return {
    text: value.text,
    confidence: typeof value.confidence === 'number' ? value.confidence : undefined,
    boundingBox: value.bbox,
  }
}

function isBoundingBox(value: unknown): value is OcrLine['boundingBox'] {
  return isRecord(value) && ['x0', 'y0', 'x1', 'y1'].every((key) => typeof value[key] === 'number')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
