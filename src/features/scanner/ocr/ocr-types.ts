export interface OcrResult {
  text: string
  confidence?: number
  lines?: OcrLine[]
}

export interface OcrLine {
  text: string
  confidence?: number
  boundingBox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export interface OcrProgress {
  stage: 'preparing' | 'recognizing'
  progress?: number
}

export type OcrProgressListener = (progress: OcrProgress) => void
