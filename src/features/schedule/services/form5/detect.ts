import type { OCRResult } from '../ocr'
import type { CropRectangle } from './preprocess'

const formAnchors = [
  'UNIVERSITY OF THE PHILIPPINES',
  'UP FORM 5',
  'CERTIFICATE OF REGISTRATION',
  'CLASS CODE',
  'SCHEDULE ROOM',
]

function normalizeText(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectForm5(text: string) {
  const normalized = normalizeText(text)
  const matches = formAnchors.filter((anchor) => {
    const normalizedAnchor = normalizeText(anchor)
    return (
      normalized.includes(normalizedAnchor) ||
      (normalizedAnchor === 'SCHEDULE ROOM' && normalized.includes('SCHEDULE'))
    )
  })
  return {
    isForm5:
      matches.length >= 2 &&
      (matches.includes('CLASS CODE') || matches.includes('SCHEDULE ROOM')),
    matches,
  }
}

function normalizedWord(value: string) {
  return value.toUpperCase().replace(/[^A-Z]+/g, '')
}

export function detectScheduleTable(
  result: OCRResult,
  width: number,
  height: number,
): CropRectangle | null {
  if (!result.words || result.words.length === 0) return null
  const headerWords = result.words.filter((word) => {
    const value = normalizedWord(word.text)
    return [
      'CLASS',
      'CODE',
      'SUBJECT',
      'SECTION',
      'UNITS',
      'SCHEDULE',
      'ROOM',
    ].includes(value)
  })
  const hasColumnAnchors = new Set(
    headerWords.map((word) => normalizedWord(word.text)),
  )
  if (hasColumnAnchors.size < 3) return null
  const top = Math.max(
    0,
    Math.min(...headerWords.map((word) => word.bbox.y0)) - 24,
  )
  return { x: 0, y: top, width, height: Math.max(1, height - top) }
}
