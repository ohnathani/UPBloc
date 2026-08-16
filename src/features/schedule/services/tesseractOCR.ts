import { createWorker } from 'tesseract.js'
import type { OCRProvider, OCRProgress, OCRResult, OCRWord } from './ocr'

export class TesseractOCRProvider implements OCRProvider {
  async extractText(
    image: File,
    onProgress?: (progress: OCRProgress) => void,
  ): Promise<OCRResult> {
    onProgress?.({ status: 'reading' })
    const worker = await createWorker('eng', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          onProgress?.({
            status: 'recognizing',
            progress: message.progress,
          })
        }
      },
    })

    try {
      const result = await worker.recognize(image)
      const words =
        (result.data as unknown as { words?: OCRWord[] }).words ?? []
      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words,
      }
    } finally {
      await worker.terminate()
    }
  }
}
