import { describe, expect, it } from 'vitest'
import type { OcrResult } from '@paddleocr/paddleocr-js'
import { adaptPaddleResult } from './adapter'
import { parseLabel } from '../label-parser'

const sample = (): OcrResult => ({
  image: { width: 100, height: 80 },
  items: [
    { text: 'ARROZ 5KG', score: 0.9, poly: [[1, 2], [90, 3], [91, 12], [0, 11]] },
    { text: 'R$ 24,90', score: 0.8, poly: [[5, 20], [80, 20], [80, 50], [5, 50]] },
  ],
  metrics: { detMs: 1, recMs: 2, totalMs: 3, detectedBoxes: 2, recognizedCount: 2 },
  runtime: { requestedBackend: 'wasm', detProvider: 'wasm', recProvider: 'wasm', webgpuAvailable: false },
})
describe('PaddleOCR adapter', () => {
  it('preserves raw text, polygon data and timing without completing digits', () => {
    const raw = sample()
    raw.items[1]!.text = 'R$ 24,'
    const result = adaptPaddleResult(raw, 100)
    expect(result.raw).toBe(raw)
    expect(result.text).toBe('ARROZ 5KG\nR$ 24,')
    expect(result.elapsedMs).toBe(100)
    expect(result.lines?.[0]?.boundingBox).toEqual({ x0: 0, y0: 2, x1: 91, y1: 12 })
    expect(result.confidence).toBe(85)
    expect(parseLabel(result).prices).toEqual([])
  })
  it('passes recognized monetary values to the unchanged parser', () => {
    const result = adaptPaddleResult(sample(), 3)
    expect(result.lines?.[1]?.confidence).toBe(80)
    expect(parseLabel(result).prices.map((price) => price.valueCents)).toContain(2490)
  })
  it('represents empty recognition without inventing confidence or prices', () => {
    const raw = sample(); raw.items = []
    const result = adaptPaddleResult(raw, 3)
    expect(result.text).toBe('')
    expect(result.confidence).toBeUndefined()
    expect(parseLabel(result).prices).toEqual([])
  })
  it('rejects broken region coordinates', () => {
    const raw = sample(); raw.items[0]!.poly[0] = [NaN, 0]
    expect(() => adaptPaddleResult(raw, 3)).toThrow('inválidas')
  })
  it('rejects nonfinite confidence', () => {
    const raw = sample(); raw.items[0]!.score = Infinity
    expect(() => adaptPaddleResult(raw, 3)).toThrow('inválidas')
  })
})
