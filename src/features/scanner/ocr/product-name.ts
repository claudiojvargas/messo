import { extractPriceCandidates } from './price-candidates'

const MAX_USEFUL_LINES = 3
const MAX_NAME_LENGTH = 96
const MIN_DESCRIPTION_SCORE = 8

const promotionalLines = new Set([
  'A PARTIR DE',
  'CLUBE',
  'DE',
  'OFERTA',
  'POR',
  'PRECO CLUBE',
  'PROMOCAO',
])

type CandidateLine = {
  index: number
  value: string
  score: number
  measureOnly: boolean
}

export function extractProductName(text: string): string | null {
  const candidates = text
    .split(/\r?\n/)
    .map((line, index) => classifyLine(line, index))
    .filter((line): line is CandidateLine => line !== null)

  const anchor = candidates
    .filter(({ measureOnly, score }) => !measureOnly && score >= MIN_DESCRIPTION_SCORE)
    .reduce<CandidateLine | null>((best, line) => !best || line.score > best.score ? line : best, null)

  if (!anchor) return null

  const byIndex = new Map(candidates.map((line) => [line.index, line]))
  const selected = [anchor]

  // Product descriptions normally form a compact block. Administrative lines
  // break that block, so proximity is only used to complement the best line.
  for (let index = anchor.index - 1; selected.length < MAX_USEFUL_LINES; index -= 1) {
    const neighbor = byIndex.get(index)
    if (!neighbor || !isUsefulComplement(neighbor)) break
    selected.unshift(neighbor)
  }
  for (let index = anchor.index + 1; selected.length < MAX_USEFUL_LINES; index += 1) {
    const neighbor = byIndex.get(index)
    if (!neighbor || !isUsefulComplement(neighbor)) break
    selected.push(neighbor)
  }

  return truncateAtWord(selected.map(({ value }) => value).join(' '), MAX_NAME_LENGTH)
}

function classifyLine(sourceLine: string, index: number): CandidateLine | null {
  const normalizedSource = normalizeWhitespace(sourceLine)
  if (!normalizedSource || isClearlyIrrelevant(normalizedSource)) return null

  let value = removePriceFragments(normalizedSource)
  value = value.replace(/^(?:OFERTA|PROMOÇÃO|PROMOCAO)\b[\s:–—-]*/iu, '')
  value = stripEdgePunctuation(normalizeWhitespace(value))
  if (!value || !/\p{L}/u.test(value)) return null

  const comparable = comparableText(value)
  if (promotionalLines.has(comparable) || isClearlyIrrelevant(value)) return null

  const measureOnly = isMeasureOnly(value)
  return { index, value, measureOnly, score: scoreLine(value, measureOnly) }
}

function isUsefulComplement(line: CandidateLine): boolean {
  return line.measureOnly || line.score >= MIN_DESCRIPTION_SCORE
}

/**
 * Rewards readable, letter-dense descriptions and multiple words. Numeric and
 * punctuation-heavy lines lose points; long prose is deliberately conservative.
 */
function scoreLine(value: string, measureOnly: boolean): number {
  if (measureOnly) return 1

  const letters = value.match(/\p{L}/gu)?.length ?? 0
  const digits = value.match(/\d/g)?.length ?? 0
  const relevantCharacters = letters + digits
  const words = value.match(/[\p{L}\d]+/gu)?.length ?? 0
  const letterDensity = relevantCharacters === 0 ? 0 : letters / relevantCharacters
  const separatorCount = value.match(/[/:;|]/g)?.length ?? 0

  let score = Math.round(letterDensity * 10) + Math.min(words, 4) * 2
  if (letters >= 5 && value.length <= 40) score += 2
  if (digits > letters) score -= 8
  score -= Math.min(separatorCount * 2, 6)
  if (value.length > 48 || words > 7) score -= 14
  return score
}

function isClearlyIrrelevant(value: string): boolean {
  const comparable = comparableText(value)
  return (
    promotionalLines.has(comparable) ||
    isAdministrativeLine(comparable) ||
    isBarcode(value) ||
    containsDate(value) ||
    isPromotionalPercentage(comparable) ||
    isGenericStoreHeader(comparable) ||
    /^\d+$/u.test(value)
  )
}

function removePriceFragments(line: string): string {
  let result = line
  let candidates = extractPriceCandidates(result)

  while (candidates.length > 0) {
    const previous = result
    for (const candidate of candidates) result = result.replaceAll(candidate.raw, ' ')
    if (result === previous) break
    candidates = extractPriceCandidates(result)
  }

  return normalizeWhitespace(result)
}

function normalizeWhitespace(value: string): string {
  return value.replace(/[\t\f\v ]+/g, ' ').trim()
}

function stripEdgePunctuation(value: string): string {
  return value.replace(/^[\s|,;:.*#_–—-]+|[\s|,;:.*#_–—-]+$/gu, '').trim()
}

function comparableText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
}

function isAdministrativeLine(value: string): boolean {
  return (
    /^(?:COD(?:IGO)?|EAN|PRECO|TOTAL|CONTEM|FABRICAD[OA]|EMBALAD[OA])(?:\s|:|R\$|$)/u.test(value) ||
    /^(?:L[O0]TE|DOTE)(?:\s|\/|:|$)/u.test(value) ||
    /^(?:DATA|VALIDADE|VAL[1I]DADE)(?:\s|\/|:|$)/u.test(value) ||
    /^(?:PESO|PES0)(?:\s|:|$)/u.test(value) ||
    /^R\s*\$\s*\/\s*K[G6](?:\s|:|$)/u.test(value)
  )
}

function isBarcode(value: string): boolean {
  const letters = value.match(/\p{L}/gu)?.length ?? 0
  const digits = value.match(/\d/g)?.length ?? 0
  return letters === 0 && digits >= 8
}

function containsDate(value: string): boolean {
  return /(?:^|\D)\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\D|$)/u.test(value)
}

function isPromotionalPercentage(value: string): boolean {
  return /^\d{1,3}\s*%\s*(?:OFF|DESCONTO)?$/u.test(value)
}

function isGenericStoreHeader(value: string): boolean {
  return /^(?:SUPER|HIPER)?MERCADO\b/u.test(value)
}

function isMeasureOnly(value: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*(?:G|KG|L|ML|UN|UNIDADES?)$/iu.test(value)
}

function truncateAtWord(value: string, limit: number): string {
  if (value.length <= limit) return value
  const truncated = value.slice(0, limit + 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.slice(0, lastSpace > 0 ? lastSpace : limit).trim()
}
