import type { OcrResult as PaddleResult } from '@paddleocr/paddleocr-js'
import type { OcrResult } from '../ocr-types'

export interface PaddleReading extends OcrResult {
  engine: 'paddle'
  elapsedMs: number
  raw: PaddleResult
}

/** Keep recognized text and polygons; convert SDK scores (0–1) to parser scores (0–100). */
export function adaptPaddleResult(raw: PaddleResult, elapsedMs: number): PaddleReading {
  const lines = raw.items.map(({ text, score, poly }) => {
    if (!Number.isFinite(score) || poly.length < 4 || poly.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) {
      throw new Error('Resultado PaddleOCR com coordenadas ou confiança inválidas.')
    }
    return {
      text,
      confidence: Math.max(0, Math.min(1, score)) * 100,
      boundingBox: {
        x0: Math.min(...poly.map(([x]) => x)), y0: Math.min(...poly.map(([, y]) => y)),
        x1: Math.max(...poly.map(([x]) => x)), y1: Math.max(...poly.map(([, y]) => y)),
      },
    }
  })
  return {
    engine: 'paddle', text: lines.map(({ text }) => text).join('\n'), lines,
    confidence: lines.length ? lines.reduce((sum, line) => sum + line.confidence, 0) / lines.length : undefined,
    elapsedMs, raw,
  }
}
