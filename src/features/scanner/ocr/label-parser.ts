import { parsePriceToCents } from '../../shopping-list/price'
import { extractProductName } from './product-name'
import {
  averageConfidence,
  combineConfidence,
  confidenceWeights,
  ocrConfidence,
} from './label-confidence'
import type {
  LabelParserInput,
  NormalizedLabelLine,
  ParsedLabel,
  ParsedPrice,
  ParsedPromotion,
  PriceType,
  PriceUnit,
} from './label-parser-types'

const moneyPattern = /(?:R\s*\$\s*)?(?:\d{1,3}(?:\s*\.\s*\d{3})+|\d+)\s*[,.]\s*\d{2}(?!\d)/gi
const weightPattern = /(?:PES[O0]\s*[:\-]?\s*)?(\d+(?:[,.]\d{1,3})?)\s*(KG|G)\b/iu
const regularPattern = /\b(?:DE|ANTES|PRE[CÇ][O0]\s+(?:NORMAL|REGULAR))\b/iu
const promotionPattern = /\b(?:POR|OFERTA|PROMO(?:[CÇ][AÃ]O)?|CLUBE|APP|A\s+PARTIR\s+DE|LEVE|PAGUE)\b/iu
const totalPattern = /\bTOTAL\b/iu

type PriceCandidate = {
  valueCents: number
  line: NormalizedLabelLine
  context: string
  type: PriceType
  unit?: PriceUnit
  promotion?: ParsedPromotion
  confidence: number
}

export function parseLabel(input: LabelParserInput): ParsedLabel {
  const lines = normalizeOcrLines(input)
  const weight = detectWeight(lines)
  const candidates = detectPriceCandidates(lines)
  const warnings: string[] = []

  validateWeightedPrices(candidates, weight, warnings)
  const prices = candidates.map<ParsedPrice>((candidate) => ({
    valueCents: candidate.valueCents,
    type: candidate.type,
    unit: candidate.unit,
    confidence: candidate.confidence,
    promotion: candidate.promotion,
    sourceText: candidate.line.text,
  }))

  const name = extractProductName(input.text, input.lines)
  const product = name ? {
    name,
    confidence: productConfidence(name, lines, input.confidence),
  } : undefined

  const componentConfidences = [
    ...(product ? [product.confidence] : []),
    ...prices.map(({ confidence }) => confidence),
    ...(weight ? [weight.confidence] : []),
  ]
  let overallConfidence = averageConfidence(componentConfidences)
  if (warnings.length > 0) {
    overallConfidence = combineConfidence(overallConfidence, confidenceWeights.mathematicalMismatch)
  }

  return { product, prices, weight, overallConfidence, warnings }
}

export function normalizeOcrLines(input: LabelParserInput): NormalizedLabelLine[] {
  if (input.lines?.length) {
    return [...input.lines]
      .sort((left, right) => left.boundingBox.y0 - right.boundingBox.y0 || left.boundingBox.x0 - right.boundingBox.x0)
      .map((line, index) => ({
        text: normalizeWhitespace(line.text),
        comparableText: comparableText(line.text),
        index,
        confidence: line.confidence,
        boundingBox: {
          x: line.boundingBox.x0,
          y: line.boundingBox.y0,
          width: line.boundingBox.x1 - line.boundingBox.x0,
          height: line.boundingBox.y1 - line.boundingBox.y0,
        },
      }))
      .filter(({ text }) => text.length > 0)
  }

  return input.text.split(/\r?\n/)
    .map((text, index) => ({
      text: normalizeWhitespace(text),
      comparableText: comparableText(text),
      index,
      confidence: input.confidence,
    }))
    .filter(({ text }) => text.length > 0)
}

export function normalizeMoneyToCents(value: string): number | null {
  return parsePriceToCents(value.replace(/^R\s*\$\s*/iu, '').replaceAll(/\s/g, ''))
}

export function weightedTotalMatches(
  pricePerKgCents: number,
  weightKg: number,
  totalCents: number,
  toleranceCents = 2,
): boolean {
  return Math.abs(pricePerKgCents * weightKg - totalCents) <= toleranceCents
}

function detectPriceCandidates(lines: readonly NormalizedLabelLine[]): PriceCandidate[] {
  const result: PriceCandidate[] = []
  const medianHeight = median(lines.map(({ boundingBox }) => boundingBox?.height).filter(isNumber))

  for (const line of lines) {
    for (const match of line.text.matchAll(moneyPattern)) {
      const valueCents = normalizeMoneyToCents(match[0])
      if (valueCents === null) continue
      const previous = lines.find((candidate) => candidate.index === line.index - 1)?.comparableText ?? ''
      const next = lines.find((candidate) => candidate.index === line.index + 1)?.comparableText ?? ''
      const context = `${previous} ${line.comparableText} ${next}`.trim()
      const { type, unit, explicit } = classifyPrice(line.comparableText, previous, next)
      const promotion = promotionDetails(context, type)
      const layoutSignal = medianHeight && line.boundingBox && line.boundingBox.height > medianHeight * 1.35
        ? confidenceWeights.layoutSignal
        : 0
      const base = ocrConfidence(line.confidence)
      const ambiguity = type === 'UNKNOWN' ? confidenceWeights.ambiguousType : 0
      const contextSignal = explicit ? confidenceWeights.explicitContext : 0
      const unitSignal = unit ? confidenceWeights.unitContext : 0

      result.push({
        valueCents,
        line,
        context,
        type,
        unit,
        promotion,
        confidence: combineConfidence(base, contextSignal, unitSignal, layoutSignal, ambiguity),
      })
    }
  }
  return result
}

function classifyPrice(line: string, previous: string, next: string): { type: PriceType; unit?: PriceUnit; explicit: boolean } {
  const unit = priceUnit(line)
  if (totalPattern.test(line)) {
    return { type: 'WEIGHTED_TOTAL', explicit: true }
  }
  if (regularPattern.test(line)) {
    return { type: 'REGULAR_PRICE', unit, explicit: true }
  }
  if (promotionPattern.test(line)) {
    return { type: 'PROMOTIONAL_PRICE', unit, explicit: true }
  }
  if (totalPattern.test(previous) && !unit) return { type: 'WEIGHTED_TOTAL', explicit: true }
  if (regularPattern.test(previous)) return { type: 'REGULAR_PRICE', unit, explicit: true }
  if (promotionPattern.test(previous) || promotionPattern.test(next)) {
    return { type: 'PROMOTIONAL_PRICE', unit, explicit: true }
  }
  if (unit === 'KG') return { type: 'PRICE_PER_KG', unit, explicit: true }
  if (unit === '100G') return { type: 'PRICE_PER_100G', unit, explicit: true }
  if (unit === 'UNIT') return { type: 'UNIT_PRICE', unit, explicit: true }
  return { type: 'UNKNOWN', explicit: false }
}

function priceUnit(value: string): PriceUnit | undefined {
  if (/(?:\/|POR)\s*100\s*G\b|100\s*G\b/iu.test(value)) return '100G'
  if (/(?:\/|POR)\s*K[G6]\b|R\s*\$\s*\/\s*K[G6]\b/iu.test(value)) return 'KG'
  if (/\b(?:CADA|UN(?:IDADE)?)\b/iu.test(value)) return 'UNIT'
  return undefined
}

function promotionDetails(context: string, type: PriceType): ParsedPromotion | undefined {
  if (type !== 'PROMOTIONAL_PRICE') return undefined
  const quantity = context.match(/(?:A\s+PARTIR\s+DE|LEVE)\s*(\d+)/iu)?.[1]
  const condition = /\bCLUBE\b/iu.test(context)
    ? 'MEMBERSHIP'
    : /\bAPP\b/iu.test(context)
      ? 'APP'
      : quantity ? 'MIN_QUANTITY' : undefined
  return {
    condition,
    minimumQuantity: quantity ? Number(quantity) : undefined,
    description: context,
  }
}

function detectWeight(lines: readonly NormalizedLabelLine[]): ParsedLabel['weight'] {
  for (const line of lines) {
    if (!/\bPES[O0]\b/iu.test(line.comparableText)) continue
    const match = line.text.match(weightPattern)
    if (!match?.[1] || !match[2]) continue
    const value = Number(match[1].replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) continue
    return {
      value,
      unit: match[2].toUpperCase() as 'KG' | 'G',
      confidence: combineConfidence(ocrConfidence(line.confidence), confidenceWeights.explicitContext),
    }
  }
  return undefined
}

function validateWeightedPrices(
  candidates: PriceCandidate[],
  detectedWeight: ParsedLabel['weight'],
  warnings: string[],
): void {
  if (detectedWeight === undefined) return
  const weightKg = detectedWeight.unit === 'G' ? detectedWeight.value / 1_000 : detectedWeight.value
  const totals = candidates.filter(({ type }) => type === 'WEIGHTED_TOTAL')
  const perKg = candidates.filter(({ unit, type }) => unit === 'KG' && type !== 'WEIGHTED_TOTAL')
  if (!totals.length || !perKg.length) return

  let hasMatch = false
  for (const price of perKg) {
    for (const total of totals) {
      if (weightedTotalMatches(price.valueCents, weightKg, total.valueCents)) {
        price.confidence = combineConfidence(price.confidence, confidenceWeights.mathematicalMatch)
        total.confidence = combineConfidence(total.confidence, confidenceWeights.mathematicalMatch)
        hasMatch = true
      }
    }
  }
  if (!hasMatch) {
    warnings.push('O preço por kg, o peso e o total não são matematicamente consistentes.')
    for (const candidate of [...perKg, ...totals]) {
      candidate.confidence = combineConfidence(candidate.confidence, confidenceWeights.mathematicalMismatch)
    }
  }
}

function productConfidence(name: string, lines: readonly NormalizedLabelLine[], fallback?: number): number {
  const matching = lines.find(({ text }) => name.includes(text))
  const letters = name.match(/\p{L}/gu)?.length ?? 0
  const uppercase = name.match(/\p{Lu}/gu)?.length ?? 0
  const uppercaseSignal = letters > 0 && uppercase / letters >= 0.8 ? confidenceWeights.nearbyContext : 0
  const positionSignal = matching && matching.index <= Math.max(1, Math.floor(lines.length / 3))
    ? confidenceWeights.layoutSignal
    : 0
  return combineConfidence(ocrConfidence(matching?.confidence ?? fallback), uppercaseSignal, positionSignal)
}

function comparableText(value: string): string {
  return normalizeWhitespace(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function isNumber(value: number | undefined): value is number {
  return typeof value === 'number' && value > 0
}
