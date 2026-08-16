import type { OCRProgress, OCRProvider } from '../ocr'
import { parseForm5ScheduleText, type Form5ParseResult } from './parser'
import { cropImage, preprocessForm5Image } from './preprocess'
import { detectForm5, detectScheduleTable } from './detect'

export type Form5PipelineStage =
  'preparing' | 'reading' | 'detecting' | 'cropping' | 'extracting' | 'checking'

export type Form5PipelineResult = Form5ParseResult & {
  preprocessingWarning?: string
}

export async function extractForm5Schedule(
  image: File,
  provider: OCRProvider,
  onStage?: (stage: Form5PipelineStage) => void,
  onOCRProgress?: (progress: OCRProgress) => void,
): Promise<Form5PipelineResult> {
  onStage?.('preparing')
  const prepared = await preprocessForm5Image(image)
  onStage?.('reading')
  const documentOCR = await provider.extractText(prepared.file, onOCRProgress)
  onStage?.('detecting')

  const detection = detectForm5(documentOCR.text)
  if (!detection.isForm5) {
    throw new Error("This doesn't appear to be a UP Form 5.")
  }

  const table = detectScheduleTable(
    documentOCR,
    prepared.width,
    prepared.height,
  )
  let scheduleText = documentOCR.text
  if (table) {
    onStage?.('cropping')
    const tableImage = await cropImage(prepared.file, table)
    onStage?.('extracting')
    const tableOCR = await provider.extractText(tableImage, onOCRProgress)
    scheduleText = tableOCR.text
  }

  onStage?.('checking')
  const parsed = parseForm5ScheduleText(scheduleText)
  return {
    ...parsed,
    preprocessingWarning: prepared.warning,
  }
}
