import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureVideoFrame } from './camera'

afterEach(() => vi.unstubAllGlobals())

describe('framed camera capture', () => {
  it('encodes only the source rectangle at native resolution, without drawing the overlay', async () => {
    const drawImage = vi.fn()
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const toBlob = vi.fn((callback: BlobCallback) => callback(blob))
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob }
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
    const video = { videoWidth: 1920, videoHeight: 1080, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) } as HTMLVideoElement
    const frame = { getBoundingClientRect: () => ({ left: 100, top: 150, width: 200, height: 100 }) } as HTMLElement

    const image = await captureVideoFrame(video, frame)

    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 480, 300, 960, 480, 0, 0, 960, 480)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92)
    expect(canvas.width).toBe(960)
    expect(canvas.height).toBe(480)
    expect(image).toEqual({ blob, width: 960, height: 480, source: { width: 1920, height: 1080, crop: { left: 480, top: 300, width: 960, height: 480 } } })
  })

  it('does not encode a full-frame fallback when the frame is outside the video', async () => {
    const createElement = vi.fn()
    vi.stubGlobal('document', { createElement })
    const video = { videoWidth: 1920, videoHeight: 1080, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) } as HTMLVideoElement
    const frame = { getBoundingClientRect: () => ({ left: 500, top: 500, width: 100, height: 100 }) } as HTMLElement
    await expect(captureVideoFrame(video, frame)).rejects.toMatchObject({ kind: 'capture-failed' })
    expect(createElement).not.toHaveBeenCalled()
  })
})
