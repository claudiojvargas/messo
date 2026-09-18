import { CameraError } from './camera-errors'

export interface CapturedImage {
  blob: Blob
  width: number
  height: number
}

const preferredConstraints: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}

export async function startCamera(): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('unsupported', 'Camera API is not available in this context.')
  }

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OverconstrainedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      } catch (fallbackError) {
        throw new CameraError('constraints', 'No compatible camera constraints.', { cause: fallbackError })
      }
    }
    throw error
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function captureVideoFrame(video: HTMLVideoElement): Promise<CapturedImage> {
  const { videoWidth: width, videoHeight: height } = video
  if (width <= 0 || height <= 0) {
    throw new CameraError('capture-failed', 'The video has no capture dimensions.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new CameraError('capture-failed', 'Canvas is not available.')

  context.drawImage(video, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) throw new CameraError('capture-failed', 'The browser did not create an image.')

  return { blob, width, height }
}
