export type ExtractionStage =
  'preparing' | 'reading' | 'detecting' | 'cropping' | 'extracting' | 'checking'

type ExtractionProgressProps = {
  stage: ExtractionStage
}

const stages: Array<{ key: ExtractionStage; label: string }> = [
  { key: 'preparing', label: 'Preparing image' },
  { key: 'reading', label: 'Reading screenshot' },
  { key: 'detecting', label: 'Verifying Form 5' },
  { key: 'cropping', label: 'Locating schedule table' },
  { key: 'extracting', label: 'Extracting schedule rows' },
  { key: 'checking', label: 'Checking schedule' },
]

export function ExtractionProgress({ stage }: ExtractionProgressProps) {
  const activeIndex = stages.findIndex((item) => item.key === stage)

  return (
    <div className="schedule-progress" aria-live="polite">
      <p className="eyebrow">Step 2</p>
      <h2>Reading your schedule</h2>
      <p className="muted">UPBloc is preparing classes for you to review.</p>
      <ol>
        {stages.map((item, index) => (
          <li key={item.key} className={index <= activeIndex ? 'active' : ''}>
            <span aria-hidden="true">
              {index < activeIndex ? '✓' : index + 1}
            </span>
            {item.label}
          </li>
        ))}
      </ol>
      <p className="schedule-progress-note">
        This can take a moment for a large screenshot.
      </p>
    </div>
  )
}
