import type { OcrLine } from './ocr-types'

export type PriceType =
  | 'REGULAR_PRICE'
  | 'PROMOTIONAL_PRICE'
  | 'UNIT_PRICE'
  | 'PRICE_PER_KG'
  | 'PRICE_PER_100G'
  | 'WEIGHTED_TOTAL'
  | 'UNKNOWN'

export type PriceUnit = 'UNIT' | 'KG' | '100G'
export type PromotionCondition = 'MEMBERSHIP' | 'MIN_QUANTITY' | 'APP' | 'OTHER'

export interface ParsedPromotion {
  condition?: PromotionCondition
  minimumQuantity?: number
  description?: string
}

export interface ParsedPrice {
  /** Money follows the application's integer-cent convention. */
  valueCents: number
  type: PriceType
  unit?: PriceUnit
  confidence: number
  promotion?: ParsedPromotion
  sourceText: string
}

export interface ParsedLabel {
  product?: {
    name: string
    confidence: number
  }
  prices: ParsedPrice[]
  weight?: {
    value: number
    unit: 'KG' | 'G'
    confidence: number
  }
  overallConfidence: number
  warnings: string[]
}

export interface LabelParserInput {
  text: string
  lines?: readonly OcrLine[]
  confidence?: number
}

export interface NormalizedLabelLine {
  text: string
  comparableText: string
  index: number
  confidence?: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}
