export interface OcrResult {
  text: string
  confidence?: number
}

export interface OcrProgress {
  stage: 'preparing' | 'recognizing'
  progress?: number
}

export type OcrProgressListener = (progress: OcrProgress) => void
