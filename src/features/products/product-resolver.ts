export type ProductUnit = 'G' | 'KG' | 'ML' | 'L' | 'UN'

export interface NormalizedProductName {
  rawName: string
  productName: string
  quantity?: number
  unit?: ProductUnit
  attributes: string[]
  canonicalName: string
}

export interface ProductResolution extends NormalizedProductName {
  product?: string
  suggestions: string[]
  ambiguous: boolean
}

export interface ProductResolverOptions {
  catalog: readonly string[]
  suggestionLimit?: number
}

const DEFAULT_SUGGESTION_LIMIT = 4

const unitAliases: Record<string, ProductUnit> = {
  G: 'G', GR: 'G', GRAMA: 'G', GRAMAS: 'G',
  KG: 'KG', KGS: 'KG', QUILO: 'KG', QUILOS: 'KG',
  ML: 'ML',
  L: 'L', LT: 'L', LTS: 'L', LITRO: 'L', LITROS: 'L',
  UN: 'UN', UND: 'UN', UNID: 'UN', UNIDADE: 'UN', UNIDADES: 'UN',
}

const attributePatterns = [
  'SEM LACTOSE',
  'TIPO 1',
  'PARBOILIZADO',
  'TRADICIONAL',
  'SEMIDESNATADO',
  'DESNATADO',
  'INTEGRAL',
  'REFINADO',
] as const

/**
 * Product types are intentionally generic, not brands. Longer phrases may be
 * added here as the catalog evolves without coupling the resolver to OCR.
 */
const genericProductTypes = [
  'PAPEL HIGIENICO',
  'OLEO DE SOJA',
  'CAFE EM PO',
  'ACUCAR',
  'ARROZ',
  'CAFE',
  'LEITE',
  'MACARRAO',
] as const

export function normalizeProductText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9.,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d+(?:[.,]\d+)?)\s+(KG|KGS|G|GR|ML|L|LT|LTS|UN|UND|UNID)\b/g, '$1$2')
}

export function normalizeDetectedProduct(rawName: string): NormalizedProductName {
  const normalized = normalizeProductText(rawName)
  const measure = extractMeasure(normalized)
  const attributes = attributePatterns.filter((attribute) => containsPhrase(normalized, attribute))
  const withoutMeasure = measure ? removeRange(normalized, measure.index, measure.length) : normalized
  const productName = detectProductType(withoutMeasure)
  const canonicalName = [productName, measure ? `${formatQuantity(measure.quantity)}${measure.unit}` : '']
    .filter(Boolean)
    .join(' ')

  return {
    rawName,
    productName,
    quantity: measure?.quantity,
    unit: measure?.unit,
    attributes: [...attributes],
    canonicalName,
  }
}

export function resolveProductName(
  rawName: string,
  { catalog, suggestionLimit = DEFAULT_SUGGESTION_LIMIT }: ProductResolverOptions,
): ProductResolution {
  const detected = normalizeDetectedProduct(rawName)
  const entries = uniqueCatalog(catalog).map((name) => ({ name, normalized: normalizeDetectedProduct(name) }))
  const literalMatches = entries.filter(({ name }) => normalizeProductText(name) === detected.canonicalName)
  const canonicalMatches = entries.filter(({ normalized }) => (
    detected.canonicalName.length > 0 && normalized.canonicalName === detected.canonicalName
  ))
  const matches = literalMatches.length > 0 ? literalMatches : canonicalMatches
  const product = matches.length === 1 ? matches[0]?.name : undefined
  const ambiguous = matches.length > 1
  const excluded = new Set(product ? [normalizeProductText(product)] : [])
  const suggestions = entries
    .filter(({ name }) => !excluded.has(normalizeProductText(name)))
    .map((entry) => ({ ...entry, score: suggestionScore(detected, entry.normalized) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'pt-BR'))
    .slice(0, Math.max(0, suggestionLimit))
    .map(({ name }) => name)

  return { ...detected, product, suggestions, ambiguous }
}

function extractMeasure(value: string): { quantity: number; unit: ProductUnit; index: number; length: number } | undefined {
  const pattern = /(\d+(?:[.,]\d+)?)\s*(KG|KGS|QUILOS?|G|GR|GRAMAS?|ML|L|LT|LTS|LITROS?|UN|UND|UNID|UNIDADES?)\b/g
  let selected: RegExpExecArray | null = null
  for (const match of value.matchAll(pattern)) selected = match
  if (!selected?.[1] || !selected[2] || selected.index === undefined) return undefined
  const quantity = Number(selected[1].replace(',', '.'))
  const unit = unitAliases[selected[2]]
  if (!Number.isFinite(quantity) || quantity <= 0 || !unit) return undefined
  return { quantity, unit, index: selected.index, length: selected[0].length }
}

function detectProductType(value: string): string {
  const cleaned = attributePatterns.reduce((result, attribute) => (
    result.replace(new RegExp(`\\b${attribute.replace(' ', '\\s+')}\\b`, 'g'), ' ')
  ), value).replace(/\s+/g, ' ').trim()
  const knownType = genericProductTypes.find((type) => containsPhrase(cleaned, type) && cleaned.indexOf(type) === 0)
  if (knownType) return knownType
  return cleaned.match(/^[A-Z]+(?:\s+(?:DE|DA|DO)\s+[A-Z]+)?/)?.[0] ?? ''
}

function suggestionScore(detected: NormalizedProductName, candidate: NormalizedProductName): number {
  if (!detected.productName || !candidate.productName) return 0
  const sameProduct = detected.productName === candidate.productName
  const closeProduct = editDistance(detected.productName, candidate.productName) <= 2
  if (!sameProduct && !closeProduct) return 0

  let score = sameProduct ? 100 : 35
  if (detected.unit && candidate.unit === detected.unit) score += 20
  if (detected.quantity !== undefined && candidate.quantity === detected.quantity) score += 30
  if (detected.unit && candidate.unit && detected.unit !== candidate.unit) score -= 15
  return score
}

function uniqueCatalog(catalog: readonly string[]): string[] {
  const result = new Map<string, string>()
  for (const name of catalog) {
    const trimmed = name.trim()
    const key = normalizeProductText(trimmed)
    if (key && !result.has(key)) result.set(key, trimmed)
  }
  return [...result.values()]
}

function containsPhrase(value: string, phrase: string): boolean {
  return new RegExp(`(?:^| )${phrase.replace(' ', '\\s+')}(?: |$)`).test(value)
}

function removeRange(value: string, index: number, length: number): string {
  return `${value.slice(0, index)} ${value.slice(index + length)}`.replace(/\s+/g, ' ').trim()
}

function formatQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(quantity).replace('.', ',')
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + Number(left[leftIndex - 1] !== right[rightIndex - 1]),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length] ?? Math.max(left.length, right.length)
}
