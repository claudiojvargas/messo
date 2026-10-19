import { CameraError } from './camera-errors'

export interface FrameRect {
  left: number
  top: number
  width: number
  height: number
}

function assertRect(rect: FrameRect): void {
  if (![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) {
    throw new CameraError('capture-failed', 'Invalid camera framing dimensions.')
  }
}

/** Centered object-fit geometry in CSS pixels. The preview has no CSS mirroring/rotation. */
export function videoContentRect(
  videoWidth: number,
  videoHeight: number,
  bounds: FrameRect,
  fit: 'contain' | 'cover' = 'contain',
): FrameRect {
  assertRect(bounds)
  assertRect({ left: 0, top: 0, width: videoWidth, height: videoHeight })
  const scale = Math[fit === 'cover' ? 'max' : 'min'](bounds.width / videoWidth, bounds.height / videoHeight)
  const width = videoWidth * scale
  const height = videoHeight * scale
  return { left: bounds.left + (bounds.width - width) / 2, top: bounds.top + (bounds.height - height) / 2, width, height }
}

/** Round inward so encoded pixels never extend outside the visible frame. */
export function videoCropRect(
  videoWidth: number,
  videoHeight: number,
  bounds: FrameRect,
  frame: FrameRect,
  fit: 'contain' | 'cover' = 'contain',
): FrameRect {
  assertRect(frame)
  const content = videoContentRect(videoWidth, videoHeight, bounds, fit)
  const left = Math.max(frame.left, content.left, bounds.left)
  const top = Math.max(frame.top, content.top, bounds.top)
  const right = Math.min(frame.left + frame.width, content.left + content.width, bounds.left + bounds.width)
  const bottom = Math.min(frame.top + frame.height, content.top + content.height, bounds.top + bounds.height)
  const x = Math.max(0, Math.ceil((left - content.left) * videoWidth / content.width))
  const y = Math.max(0, Math.ceil((top - content.top) * videoHeight / content.height))
  const endX = Math.min(videoWidth, Math.floor((right - content.left) * videoWidth / content.width))
  const endY = Math.min(videoHeight, Math.floor((bottom - content.top) * videoHeight / content.height))
  const crop = { left: x, top: y, width: endX - x, height: endY - y }
  assertRect(crop)
  return crop
}
