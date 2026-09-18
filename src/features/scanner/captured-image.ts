import type { CapturedImage } from './camera'

let capturedImage: CapturedImage | null = null

export function storeCapturedImage(image: CapturedImage): void {
  capturedImage = image
}

export function getCapturedImage(): CapturedImage | null {
  return capturedImage
}

export function clearCapturedImage(): void {
  capturedImage = null
}
