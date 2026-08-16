export type OCRProgress = {
  status: 'reading' | 'recognizing'
  progress?: number
}

export type OCRResult = {
  text: string
  confidence?: number
  words?: OCRWord[]
}

export type OCRWord = {
  text: string
  confidence?: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export interface OCRProvider {
  extractText(
    image: File,
    onProgress?: (progress: OCRProgress) => void,
  ): Promise<OCRResult>
}
