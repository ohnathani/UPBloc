export type PreprocessedImage = {
  file: File
  width: number
  height: number
  warning?: string
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image could not be opened.'))
    }
    image.src = url
  })
}

function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The image could not be prepared for OCR.'))
        return
      }
      resolve(new File([blob], name, { type: 'image/png' }))
    }, 'image/png')
  })
}

export async function preprocessForm5Image(
  file: File,
): Promise<PreprocessedImage> {
  const image = await loadImage(file)
  const scale =
    image.naturalWidth < 1600 ? Math.min(2, 1600 / image.naturalWidth) : 1
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('Image preprocessing is not supported in this browser.')

  context.filter =
    image.naturalWidth < 1600 ? 'grayscale(1) contrast(1.15)' : 'none'
  context.drawImage(image, 0, 0, width, height)

  return {
    file: await canvasToFile(canvas, 'up-form-5-preprocessed.png'),
    width,
    height,
    warning:
      image.naturalWidth < 1000 || image.naturalHeight < 700
        ? 'The image may be too low-resolution to read accurately.'
        : undefined,
  }
}

export type CropRectangle = {
  x: number
  y: number
  width: number
  height: number
}

export async function cropImage(file: File, crop: CropRectangle) {
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('Image cropping is not supported in this browser.')
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  )
  return canvasToFile(canvas, 'up-form-5-schedule-table.png')
}
