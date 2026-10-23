import { afterEach, describe, expect, it, vi } from 'vitest'
import { enhancePixels, prepareOcrImage, preprocessingOptions } from './image-preprocessing'
import type { CapturedImage } from './camera'

const options = { enabled: true, grayscale: false, contrast: 1.08 }
const original: CapturedImage = { blob: new Blob(['original JPEG'], { type: 'image/jpeg' }), width: 2, height: 1 }

afterEach(() => vi.unstubAllGlobals())

function browserCanvas(failure?: 'context' | 'pixels' | 'encode' | 'decode') {
  const bitmap = { width: 2, height: 1, close: vi.fn() }
  const pixels = { data: new Uint8ClampedArray([120, 128, 200, 255, 0, 255, 50, 160]) }
  const context = { drawImage: vi.fn(), getImageData: vi.fn(() => {
    if (failure === 'pixels') throw new Error('Pixel read failed')
    return pixels
  }), putImageData: vi.fn() }
  const processed = new Blob(['processed PNG'], { type: 'image/png' })
  const canvas = { width: 0, height: 0, getContext: () => failure === 'context' ? null : context, toBlob: vi.fn((callback: BlobCallback) => callback(failure === 'encode' ? null : processed)) }
  const decode = vi.fn(async () => {
    if (failure === 'decode') throw new Error('Decode failed')
    return bitmap
  })
  vi.stubGlobal('createImageBitmap', decode)
  vi.stubGlobal('document', { createElement: () => canvas })
  return { bitmap, canvas, context, pixels, processed, decode }
}

describe('conservative image preprocessing', () => {
  it('preserves colored punctuation and alpha while applying bounded contrast', () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 120, 128, 200, 80, 255, 255, 255, 255])
    enhancePixels(pixels, false, 1.08)
    expect([...pixels]).toEqual([0, 0, 0, 255, 119, 128, 206, 80, 255, 255, 255, 255])
  })

  it('makes grayscale optional rather than removing color by default', () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 100])
    enhancePixels(pixels, true, 1)
    expect([...pixels]).toEqual([76, 76, 76, 100])
    expect(preprocessingOptions('')).toEqual(options)
    expect(preprocessingOptions('?ocrPreprocess=off&ocrGrayscale=1')).toEqual({ ...options, enabled: false, grayscale: true })
  })

  it('returns the identical original object and Blob without decoding when disabled', async () => {
    const { decode } = browserCanvas()
    const result = await prepareOcrImage(original, { ...options, enabled: false })
    expect(result.state).toBe('disabled')
    expect(result.image).toBe(original)
    expect(decode).not.toHaveBeenCalled()
  })

  it('encodes losslessly at decoded dimensions, preserves crop metadata and releases resources', async () => {
    const { bitmap, canvas, processed, decode, context } = browserCanvas()
    const image = { ...original, source: { width: 4, height: 2, crop: { left: 1, top: 0, width: 2, height: 1 } } }
    const result = await prepareOcrImage(image, options)
    expect(result.state).toBe('processed')
    expect(result.image).toEqual({ ...image, blob: processed })
    expect(image.blob).toBe(original.blob)
    expect(decode).toHaveBeenCalledWith(original.blob, { imageOrientation: 'from-image' })
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([0, 0])
  })

  it('uses the browser-oriented dimensions without rotating already oriented canvas captures', async () => {
    const { bitmap } = browserCanvas()
    bitmap.width = 1
    bitmap.height = 2
    const result = await prepareOcrImage(original, options)
    expect([result.image.width, result.image.height]).toEqual([1, 2])
  })

  it.each(['decode', 'context', 'pixels', 'encode'] as const)('falls back to the exact original after %s failure', async (failure) => {
    const { bitmap, canvas } = browserCanvas(failure)
    const result = await prepareOcrImage(original, options)
    expect(result.state).toBe('fallback')
    expect(result.image).toBe(original)
    expect(result.image.blob).toBe(original.blob)
    expect(result.error).toBeTruthy()
    if (failure !== 'decode') expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([0, 0])
  })

  it('rejects aggressive contrast by returning the original without decoding', async () => {
    const { decode } = browserCanvas()
    expect((await prepareOcrImage(original, { ...options, contrast: 2 })).image).toBe(original)
    expect(decode).not.toHaveBeenCalled()
  })

  it('releases a decoded bitmap when cancellation happens during decoding', async () => {
    const { bitmap } = browserCanvas()
    const controller = new AbortController()
    vi.stubGlobal('createImageBitmap', async () => { controller.abort(); return bitmap })
    const result = await prepareOcrImage(original, options, controller.signal)
    expect(result.image).toBe(original)
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('falls back and releases resources when the encoder throws', async () => {
    const { canvas, bitmap } = browserCanvas()
    canvas.toBlob.mockImplementation(() => { throw new Error('Encoder failed') })
    expect((await prepareOcrImage(original, options)).image).toBe(original)
    expect(bitmap.close).toHaveBeenCalledOnce()
    expect([canvas.width, canvas.height]).toEqual([0, 0])
  })

  it('honors cancellation before allocating pixels', async () => {
    const { decode } = browserCanvas()
    const controller = new AbortController()
    controller.abort()
    expect((await prepareOcrImage(original, options, controller.signal)).image).toBe(original)
    expect(decode).not.toHaveBeenCalled()
  })
})
