export type CourseColor = {
  background: string
  border: string
  text: string
}

const coursePalette: CourseColor[] = [
  { background: '#f8e8ed', border: '#8d1436', text: '#71102b' },
  { background: '#e6f1ed', border: '#00563f', text: '#004632' },
  { background: '#fff4d5', border: '#c28a00', text: '#765500' },
  { background: '#e9eef5', border: '#536b86', text: '#344b66' },
  { background: '#f1e9f3', border: '#80618a', text: '#5d4268' },
  { background: '#f4ece3', border: '#a36b36', text: '#70481f' },
]

export function getCourseColor(courseCode: string): CourseColor {
  const normalized = courseCode.trim().toUpperCase()
  let hash = 0

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) | 0
  }

  return coursePalette[Math.abs(hash) % coursePalette.length]
}
