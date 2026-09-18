import { afterEach, describe, expect, it } from 'vitest'
import { clearCapturedImage, getCapturedImage, storeCapturedImage } from './captured-image'

afterEach(clearCapturedImage)

describe('captured image memory', () => {
  it('keeps the selected Blob and dimensions only in memory', () => {
    const image = {
      blob: new Blob(['photo'], { type: 'image/jpeg' }),
      width: 1920,
      height: 1080,
    }

    storeCapturedImage(image)

    expect(getCapturedImage()).toBe(image)
    expect(getCapturedImage()?.blob.type).toBe('image/jpeg')
  })

  it('can release the selected image', () => {
    storeCapturedImage({ blob: new Blob(), width: 1, height: 1 })
    clearCapturedImage()
    expect(getCapturedImage()).toBeNull()
  })
})
