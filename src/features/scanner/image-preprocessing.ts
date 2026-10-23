import type { CapturedImage } from './camera'

export interface PreprocessingOptions {
  enabled: boolean
  grayscale: boolean
  contrast: number
}

export interface PreparedOcrImage {
  image: CapturedImage
  state: 'processed' | 'disabled' | 'fallback'
  elapsedMs: number
  options: PreprocessingOptions
  error?: string
}

export function preprocessingOptions(search: string): PreprocessingOptions {
  const params = new URLSearchParams(search)
  return { enabled: params.get('ocrPreprocess') !== 'off', grayscale: params.get('ocrGrayscale') === '1', contrast: 1.08 }
}

/** Pointwise adjustments: no threshold, resizing, sharpening or neighborhood filter. */
export function enhancePixels(data: Uint8ClampedArray, grayscale: boolean, contrast: number): void {
  const levels = Uint8ClampedArray.from({ length: 256 }, (_, value) => Math.round((value - 128) * contrast + 128))
  for (let index = 0; index < data.length; index += 4) {
    if (grayscale) {
      const gray = Math.round(data[index]! * 0.299 + data[index + 1]! * 0.587 + data[index + 2]! * 0.114)
      data[index] = data[index + 1] = data[index + 2] = levels[gray]!
    } else {
      data[index] = levels[data[index]!]!
      data[index + 1] = levels[data[index + 1]!]!
      data[index + 2] = levels[data[index + 2]!]!
    }
  }
}

const yieldToBrowser = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** Prepares one captured crop. Every failure returns the exact original object/Blob. */
export async function prepareOcrImage(
  original: CapturedImage,
  options: PreprocessingOptions,
  signal?: AbortSignal,
): Promise<PreparedOcrImage> {
  const started = performance.now()
  const result = (image: CapturedImage, state: PreparedOcrImage['state'], error?: string): PreparedOcrImage => ({
    image, state, options, elapsedMs: Math.round(performance.now() - started), ...(error ? { error } : {}),
  })
  if (!options.enabled) return result(original, 'disabled')
  let bitmap: ImageBitmap | undefined
  let canvas: HTMLCanvasElement | undefined
  try {
    if (!Number.isFinite(options.contrast) || options.contrast < 1 || options.contrast > 1.15) {
      throw new Error('Contrast outside the conservative preprocessing range.')
    }
    await yieldToBrowser() // Allow the processing dialog to paint before decoding.
    signal?.throwIfAborted()
    // Browser decoding applies EXIF to file inputs; camera canvas JPEGs have no rotation to repeat.
    bitmap = await createImageBitmap(original.blob, { imageOrientation: 'from-image' })
    signal?.throwIfAborted()
    if (!bitmap.width || !bitmap.height) throw new Error('Image has no dimensions.')
    canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas is unavailable.')
    context.drawImage(bitmap, 0, 0)
    let lastYield = performance.now()
    // Bounded strips avoid allocating a second full-resolution RGBA buffer.
    for (let top = 0; top < canvas.height; top += 64) {
      signal?.throwIfAborted()
      const pixels = context.getImageData(0, top, canvas.width, Math.min(64, canvas.height - top))
      enhancePixels(pixels.data, options.grayscale, options.contrast)
      context.putImageData(pixels, 0, top)
      if (performance.now() - lastYield >= 8) {
        await yieldToBrowser()
        lastYield = performance.now()
      }
    }
    signal?.throwIfAborted()
    // Lossless output avoids adding JPEG artifacts around punctuation and small characters.
    const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, 'image/png'))
    signal?.throwIfAborted()
    if (!blob || !blob.size) throw new Error('Image encoding failed.')
    return result({ ...original, blob, width: canvas.width, height: canvas.height }, 'processed')
  } catch (error) {
    return result(original, 'fallback', error instanceof Error ? error.message : String(error))
  } finally {
    bitmap?.close()
    if (canvas) canvas.width = canvas.height = 0
  }
}
