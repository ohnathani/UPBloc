import { useEffect, useMemo, useState } from 'react'
import { ExtractionProgress, type ExtractionStage } from './ExtractionProgress'
import { ImageUploader } from './ImageUploader'
import { ScheduleReview } from './ScheduleReview'
import { MockOCRProvider } from '../services/mockOCR'
import {
  extractForm5Schedule,
  type Form5PipelineStage,
} from '../services/form5/pipeline'
import { TesseractOCRProvider } from '../services/tesseractOCR'
import type { OCRProgress, OCRProvider } from '../services/ocr'
import type { ScheduleEntry } from '../types'

type ScheduleImporterProps = {
  existingEntries: ScheduleEntry[]
  onConfirm: (entries: ScheduleEntry[]) => void
  onClose: () => void
}

type ImportStep = 'upload' | 'processing' | 'review' | 'success'

function getProvider(): OCRProvider {
  return import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_OCR === 'true'
    ? new MockOCRProvider()
    : new TesseractOCRProvider()
}

export function ScheduleImporter({
  existingEntries,
  onConfirm,
  onClose,
}: ScheduleImporterProps) {
  const provider = useMemo(getProvider, [])
  const [step, setStep] = useState<ImportStep>('upload')
  const [stage, setStage] = useState<ExtractionStage>('reading')
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [parserWarnings, setParserWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl)
    }
  }, [sourcePreviewUrl])

  function handleOCRProgress(progress: OCRProgress) {
    if (progress.status === 'reading') setStage('reading')
    if (progress.status === 'recognizing') setStage('extracting')
  }

  function handlePipelineStage(nextStage: Form5PipelineStage) {
    setStage(nextStage)
  }

  async function handleExtract(file: File) {
    setError(null)
    setStep('processing')
    setStage('preparing')
    setSourcePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })

    try {
      const parsed = await extractForm5Schedule(
        file,
        provider,
        handlePipelineStage,
        handleOCRProgress,
      )
      if (parsed.entries.length === 0) {
        throw new Error(
          "We found the Form 5, but couldn't reliably read any schedule rows. Try a clearer image.",
        )
      }

      setEntries(parsed.entries)
      setParserWarnings([
        ...(parsed.preprocessingWarning ? [parsed.preprocessingWarning] : []),
        ...parsed.warnings,
      ])
      setStep('review')
    } catch (extractionError) {
      setError(
        extractionError instanceof Error
          ? extractionError.message
          : 'UPBloc could not read this screenshot. Try uploading a clearer image.',
      )
      setStep('upload')
    }
  }

  function handleConfirm(nextEntries: ScheduleEntry[]) {
    onConfirm(nextEntries)
    setImportedCount(nextEntries.length)
    setStep('success')
  }

  function resetImport() {
    setEntries([])
    setParserWarnings([])
    setError(null)
    setStep('upload')
  }

  return (
    <section
      className="schedule-importer"
      aria-labelledby="schedule-import-title"
    >
      <div className="schedule-importer-header">
        <div>
          <p className="eyebrow">Schedule importer</p>
          <h2 id="schedule-import-title">Import from CRS / Form 5</h2>
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close schedule importer"
        >
          ×
        </button>
      </div>

      {error && (
        <p className="form-error schedule-import-error" role="alert">
          {error}
        </p>
      )}

      {step === 'upload' && (
        <ImageUploader onStart={handleExtract} isProcessing={false} />
      )}
      {step === 'processing' && <ExtractionProgress stage={stage} />}
      {step === 'review' && (
        <ScheduleReview
          entries={entries}
          existingEntries={existingEntries}
          parserWarnings={parserWarnings}
          sourcePreviewUrl={sourcePreviewUrl}
          onChange={setEntries}
          onBack={resetImport}
          onConfirm={handleConfirm}
        />
      )}
      {step === 'success' && (
        <div className="schedule-success">
          <p className="eyebrow">Import complete</p>
          <h2>Schedule imported successfully.</h2>
          <p className="muted">
            {importedCount} {importedCount === 1 ? 'class was' : 'classes were'}{' '}
            added to your schedule.
          </p>
          <div className="schedule-success-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              View schedule
            </button>
            <button type="button" onClick={resetImport}>
              Import another
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
