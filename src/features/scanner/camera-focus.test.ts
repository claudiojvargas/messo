import { describe, expect, it } from 'vitest'
import { cameraDeviceDisplayName, enableContinuousFocus } from './camera'

function cameraTrack(
  focusMode: string[] | undefined,
  applyConstraints: MediaStreamTrack['applyConstraints'],
): MediaStreamTrack {
  return {
    getCapabilities: () => ({ focusMode }),
    applyConstraints,
  } as unknown as MediaStreamTrack
}

describe('enableContinuousFocus', () => {
  it('applies continuous focus only when the camera reports support', async () => {
    let receivedConstraints: MediaTrackConstraints | undefined
    const track = cameraTrack(['manual', 'continuous'], async (constraints) => {
      receivedConstraints = constraints
    })

    await expect(enableContinuousFocus(track)).resolves.toEqual({ supported: true, applied: true })
    expect(receivedConstraints).toEqual({ advanced: [{ focusMode: 'continuous' }] })
  })

  it('keeps the camera untouched when continuous focus is unavailable', async () => {
    let called = false
    const track = cameraTrack(['manual'], async () => {
      called = true
    })

    await expect(enableContinuousFocus(track)).resolves.toEqual({ supported: false, applied: false })
    expect(called).toBe(false)
  })

  it('reports a constraint error without rejecting the camera flow', async () => {
    const error = new DOMException('unsupported focus mode', 'OverconstrainedError')
    const track = cameraTrack(['continuous'], async () => {
      throw error
    })

    await expect(enableContinuousFocus(track)).resolves.toEqual({
      supported: true,
      applied: false,
      error,
    })
  })
})

describe('cameraDeviceDisplayName', () => {
  it('keeps the browser label visible so cameras can be identified', () => {
    expect(cameraDeviceDisplayName({ deviceId: 'rear-main', label: 'Back camera' }, 1))
      .toBe('Câmera 2 — Back camera')
  })

  it('uses a numbered fallback when the browser omits the label', () => {
    expect(cameraDeviceDisplayName({ deviceId: 'anonymous', label: ' ' }, 0)).toBe('Câmera 1')
  })
})
