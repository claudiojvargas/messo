import { extractPriceCandidates } from './price-candidates'

const MAX_USEFUL_LINES = 3
const MAX_NAME_LENGTH = 96

const promotionalLines = new Set([
  'A PARTIR DE',
  'CLUBE',
  'DE',
  'OFERTA',
  'POR',
  'PRECO CLUBE',
  'PROMOCAO',
])

type UsefulLine = {
  index: number
  value: string
}

export function extractProductName(text: string): string | null {
  const sourceLines = text.split(/\r?\n/)
  const firstPriceLine = sourceLines.findIndex((line) => extractPriceCandidates(line).length > 0)
  const usefulLines = sourceLines
    .map((line, index) => ({ index, value: cleanLine(line) }))
    .filter((line): line is UsefulLine => line.value !== null)

  const nearbyLines = usefulLines.filter(({ index }) => index <= firstPriceLine)
  const selectedLines = firstPriceLine >= 0
    ? (nearbyLines.length > 0 ? nearbyLines : usefulLines).slice(-MAX_USEFUL_LINES)
    : usefulLines.slice(0, MAX_USEFUL_LINES)

  if (selectedLines.length === 0 || selectedLines.every(({ value }) => isMeasureOnly(value))) {
    return null
  }

  return truncateAtWord(selectedLines.map(({ value }) => value).join(' '), MAX_NAME_LENGTH)
}

function cleanLine(sourceLine: string): string | null {
  let line = normalizeWhitespace(sourceLine)
  if (!line) return null

  line = removePriceFragments(line)
  line = stripEdgePunctuation(line)
  if (!line) return null

  const comparable = comparableText(line)
  if (
    promotionalLines.has(comparable) ||
    isAdministrativeLine(comparable) ||
    isBarcode(line) ||
    isDate(line) ||
    isPromotionalPercentage(comparable) ||
    isGenericStoreHeader(comparable) ||
    /^\d+$/.test(line)
  ) {
    return null
  }

  line = line.replace(/^(?:OFERTA|PROMOÇÃO|PROMOCAO)\b[\s:–—-]*/iu, '')
  line = stripEdgePunctuation(normalizeWhitespace(line))
  return line && /\p{L}/u.test(line) ? line : null
}

function removePriceFragments(line: string): string {
  let result = line
  let candidates = extractPriceCandidates(result)

  while (candidates.length > 0) {
    const previous = result
    for (const candidate of candidates) {
      result = result.replaceAll(candidate.raw, ' ')
    }
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
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
}

function isAdministrativeLine(value: string): boolean {
  return /^(?:COD(?:IGO)?|EAN|PRECO|VALIDADE)(?:\s|:|$)/u.test(value)
}

function isBarcode(value: string): boolean {
  return /^\D*\d{8,}\D*$/u.test(value)
}

function isDate(value: string): boolean {
  return /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/u.test(value)
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
