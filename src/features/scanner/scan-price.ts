import { openCamera } from './camera-view'
import { clearCapturedImage, storeCapturedImage } from './captured-image'
import { openOcrResult } from './ocr/ocr-view'

export type ScanPriceResult =
  | { status: 'selected'; valueCents: number }
  | { status: 'manual' }
  | { status: 'cancelled' }

export async function scanPrice(trigger: HTMLElement): Promise<ScanPriceResult> {
  while (true) {
    const image = await openCamera(trigger)
    if (!image) {
      clearCapturedImage()
      return { status: 'cancelled' }
    }

    storeCapturedImage(image)
    const decision = await openOcrResult(image, trigger).finally(clearCapturedImage)

    if (decision.action === 'retake') continue
    if (decision.action === 'manual') return { status: 'manual' }
    return { status: 'selected', valueCents: decision.valueCents }
  }
}
