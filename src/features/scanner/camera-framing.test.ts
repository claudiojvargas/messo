import { describe, expect, it } from 'vitest'
import { videoContentRect, videoCropRect } from './camera-framing'

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height })

describe('camera frame coordinates', () => {
  it('excludes top and bottom letterboxes for landscape video on a portrait screen', () => {
    const bounds = rect(10, 100, 360, 640)
    expect(videoContentRect(1920, 1080, bounds)).toEqual(rect(10, 318.75, 360, 202.5))
    expect(videoCropRect(1920, 1080, bounds, rect(46, 339, 288, 162))).toEqual(rect(192, 108, 1536, 864))
  })

  it('excludes side letterboxes for portrait video in landscape', () => {
    const bounds = rect(20, 10, 800, 450)
    const content = videoContentRect(1080, 1920, bounds)
    expect(content).toEqual(rect(293.4375, 10, 253.125, 450))
    expect(videoCropRect(1080, 1920, bounds, rect(content.left, 55, content.width, 360))).toEqual(rect(0, 192, 1080, 1536))
  })

  it('accounts for the part hidden by centered cover', () => {
    expect(videoCropRect(1920, 1080, rect(0, 0, 400, 400), rect(0, 0, 400, 400), 'cover')).toEqual(rect(420, 0, 1080, 1080))
  })

  it('clips to both the visible video and the frame, never to letterboxes', () => {
    expect(videoCropRect(400, 200, rect(0, 0, 400, 400), rect(40, 50, 320, 300))).toEqual(rect(40, 0, 320, 200))
  })

  it.each([[640, 480], [1920, 1080], [1080, 1920], [4000, 3000], [3000, 4000]])('keeps fractional crops inside the frame for %dx%d', (width, height) => {
    const bounds = rect(12.25, 83.75, 393.5, 511.25)
    const content = videoContentRect(width, height, bounds)
    const frame = rect(content.left + content.width * 0.081, content.top + content.height * 0.121, content.width * 0.837, content.height * 0.757)
    const crop = videoCropRect(width, height, bounds, frame)
    const scale = content.width / width
    const output = rect(content.left + crop.left * scale, content.top + crop.top * scale, crop.width * scale, crop.height * scale)
    expect(output.left).toBeGreaterThanOrEqual(frame.left - 1e-9)
    expect(output.top).toBeGreaterThanOrEqual(frame.top - 1e-9)
    expect(output.left + output.width).toBeLessThanOrEqual(frame.left + frame.width + 1e-9)
    expect(output.top + output.height).toBeLessThanOrEqual(frame.top + frame.height + 1e-9)
    expect(frame.width - output.width).toBeLessThanOrEqual(2 * scale)
    expect(frame.height - output.height).toBeLessThanOrEqual(2 * scale)
  })

  it('uses current dimensions after rotation instead of a previous orientation', () => {
    const bounds = rect(0, 0, 400, 400)
    expect(videoCropRect(1920, 1080, bounds, rect(100, 150, 200, 100))).toEqual(rect(480, 300, 960, 480))
    expect(videoCropRect(1080, 1920, bounds, rect(150, 100, 100, 200))).toEqual(rect(300, 480, 480, 960))
  })

  it.each([
    [0, 1080, rect(0, 0, 100, 100), rect(0, 0, 50, 50)],
    [1920, 1080, rect(0, 0, 0, 100), rect(0, 0, 50, 50)],
    [1920, 1080, rect(0, 0, 100, 100), rect(500, 500, 10, 10)],
    [1920, 1080, rect(0, 0, 100, 100), rect(NaN, 0, 10, 10)],
  ] as const)('rejects unavailable or off-screen frames instead of capturing the whole image', (width, height, bounds, frame) => {
    expect(() => videoCropRect(width, height, bounds, frame)).toThrow()
  })
})
