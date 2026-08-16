import { useEffect, useState, type ChangeEvent } from 'react'

const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp']
const maxFileSize = 10 * 1024 * 1024

type ImageUploaderProps = {
  onStart: (file: File) => void
  isProcessing: boolean
}

export function ImageUploader({ onStart, isProcessing }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [file])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    event.target.value = ''
    setError(null)

    if (!nextFile) return
    if (!acceptedTypes.includes(nextFile.type) || nextFile.size === 0) {
      setFile(null)
      setError('Please upload a PNG, JPG, JPEG, or WEBP image.')
      return
    }
    if (nextFile.size > maxFileSize) {
      setFile(null)
      setError('Please choose an image smaller than 10 MB.')
      return
    }

    setFile(nextFile)
  }

  function removeFile() {
    setFile(null)
    setError(null)
  }

  return (
    <div className="schedule-upload">
      <div className="schedule-upload-intro">
        <p className="eyebrow">Step 1</p>
        <h2>Upload your UP Form 5</h2>
        <p className="muted">
          Use a clear screenshot or image of your UP Form 5 / Certificate of
          Registration. Keep the schedule table visible; your image is processed
          temporarily in this browser.
        </p>
      </div>

      {previewUrl ? (
        <div className="schedule-image-preview">
          <img src={previewUrl} alt="Selected CRS schedule preview" />
          <div className="schedule-image-actions">
            <label className="button-secondary file-input-button">
              Replace image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </label>
            <button
              type="button"
              className="button-quiet"
              onClick={removeFile}
              disabled={isProcessing}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="schedule-dropzone">
          <span className="schedule-upload-mark" aria-hidden="true">
            +
          </span>
          <strong>Choose a schedule image</strong>
          <span>PNG, JPG, JPEG, or WEBP · up to 10 MB</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="schedule-upload-footer">
        <p className="schedule-privacy-note">
          The original screenshot is not saved to your account.
        </p>
        <button
          type="button"
          onClick={() => file && onStart(file)}
          disabled={!file || isProcessing}
        >
          {isProcessing ? 'Reading screenshot...' : 'Start import'}
        </button>
      </div>
    </div>
  )
}
