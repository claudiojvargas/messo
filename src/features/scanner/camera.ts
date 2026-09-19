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

let preferredDeviceId: string | null = null

export interface CameraDevice {
  deviceId: string
  label: string
}

type AdvancedTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[]
  zoom?: MediaSettingsRange
}

type AdvancedTrackSettings = MediaTrackSettings & {
  focusMode?: string
  zoom?: number
}

type FocusConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
}

export interface FocusConfigurationResult {
  supported: boolean
  applied: boolean
  error?: unknown
}

export async function startCamera(deviceId?: string): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('unsupported', 'Camera API is not available in this context.')
  }

  const requestedDeviceId = deviceId ?? preferredDeviceId
  if (requestedDeviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia(cameraConstraints(requestedDeviceId))
    } catch (error) {
      if (deviceId) throw error
      preferredDeviceId = null
    }
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

function cameraConstraints(deviceId: string): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  }
}

export async function prepareCameraStream(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) return

  try {
    if ('contentHint' in track) track.contentHint = 'detail'
  } catch {
    // The hint is optional and must never prevent the preview.
  }
  const focus = await enableContinuousFocus(track)
  logCameraDiagnostics(track, focus)
}

export async function listCameraDevices(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((device) => device.kind === 'videoinput' && device.deviceId)
    .map(({ deviceId, label }) => ({ deviceId, label }))
}

export function rememberCameraDevice(stream: MediaStream): void {
  preferredDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null
}

export function selectedCameraDeviceId(stream: MediaStream): string | null {
  return stream.getVideoTracks()[0]?.getSettings().deviceId ?? null
}

export function cameraDeviceDisplayName(device: CameraDevice, index: number): string {
  const label = device.label.trim()
  return label ? `Câmera ${index + 1} — ${label}` : `Câmera ${index + 1}`
}

export async function enableContinuousFocus(track: MediaStreamTrack): Promise<FocusConfigurationResult> {
  const capabilities = readAdvancedCapabilities(track)
  if (!capabilities?.focusMode?.includes('continuous')) {
    return { supported: false, applied: false }
  }

  try {
    const advanced: FocusConstraintSet = { focusMode: 'continuous' }
    await track.applyConstraints({ advanced: [advanced] })
    return { supported: true, applied: true }
  } catch (error) {
    return { supported: true, applied: false, error }
  }
}

function readAdvancedCapabilities(track: MediaStreamTrack): AdvancedTrackCapabilities | null {
  try {
    return track.getCapabilities() as AdvancedTrackCapabilities
  } catch {
    return null
  }
}

function logCameraDiagnostics(track: MediaStreamTrack, focus: FocusConfigurationResult): void {
  if (!new URLSearchParams(window.location.search).has('cameraDebug')) return

  try {
    const settings = track.getSettings() as AdvancedTrackSettings
    const capabilities = readAdvancedCapabilities(track)
    console.info('[Messo camera diagnostics]', {
      selectedCamera: {
        label: track.label || 'indisponível',
        deviceId: maskIdentifier(settings.deviceId),
      },
      settings: {
        width: settings.width,
        height: settings.height,
        aspectRatio: settings.aspectRatio,
        frameRate: settings.frameRate,
        facingMode: settings.facingMode,
        focusMode: settings.focusMode,
        zoom: settings.zoom,
      },
      capabilities: capabilities ? {
        width: capabilities.width,
        height: capabilities.height,
        facingMode: capabilities.facingMode,
        focusMode: capabilities.focusMode,
        zoom: capabilities.zoom,
      } : 'indisponíveis',
      continuousFocus: {
        supported: focus.supported,
        applied: focus.applied,
        error: focus.error instanceof Error ? focus.error.message : focus.error ? 'falha não identificada' : undefined,
      },
    })
  } catch {
    console.info('[Messo camera diagnostics]', { unavailable: true })
  }
}

function maskIdentifier(identifier: string | undefined): string {
  if (!identifier) return 'indisponível'
  return `…${identifier.slice(-4)}`
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
