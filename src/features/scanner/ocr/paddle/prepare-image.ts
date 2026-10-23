/** Experiment only: bake browser EXIF orientation into a lossless PNG once, without cropping/resizing. */
export async function prepareExperimentalImage(blob: Blob) {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem no navegador.')
    context.drawImage(bitmap, 0, 0)
    return { blob: await canvas.convertToBlob({ type: 'image/png' }), width: bitmap.width, height: bitmap.height }
  } finally { bitmap.close() }
}
