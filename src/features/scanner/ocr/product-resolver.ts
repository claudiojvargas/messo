import { PRODUCT_CATALOG } from '../../suggestions/product-catalog'

export interface ProductResolution {
  rawName: string
  productName: string
  canonicalName: string
  quantity?: number
  unit?: 'G' | 'KG' | 'ML' | 'L' | 'UN'
  attributes: string[]
  matchedProduct?: string
  suggestions: string[]
  ambiguous: boolean
}

const measurePattern = /\b(\d+(?:[.,]\d+)?)\s*(KG|G|ML|L|UN(?:IDADES?)?)\b/iu
const ignoredQualifiers = new Set([
  'TIPO', 'INTEGRAL', 'DESNATADO', 'SEMIDESNATADO', 'TRADICIONAL', 'ORIGINAL',
  'PREMIUM', 'ESPECIAL', 'EXTRAFORTE', 'ZERO', 'LIGHT', 'DIET',
])
// These packaged-product families commonly put the brand and commercial
// qualifiers between the category and the package size on shelf labels.
const compactCanonicalProducts = new Set(['ARROZ', 'MACARRAO', 'MACARRÃO', 'LEITE'])

/**
 * Keeps catalog resolution as domain data while exposing one useful value to
 * the form: a short, editable canonical product name.
 */
export function resolveProduct(rawName: string): ProductResolution {
  const productName = normalizeDisplayName(rawName)
  const measure = productName.match(measurePattern)
  const quantity = measure ? Number(measure[1]?.replace(',', '.')) : undefined
  const unit = normalizeUnit(measure?.[2])
  const measureLabel = measure && unit ? `${measure[1]?.replace('.', ',')}${unit}` : undefined
  const words = productName.replace(measurePattern, ' ').split(/\s+/u).filter(Boolean)
  const compactIndex = words.findIndex((word) => compactCanonicalProducts.has(word.toLocaleUpperCase('pt-BR')))
  const productWord = words[compactIndex >= 0 ? compactIndex : 0] ?? ''
  const trailingWords = words.slice(compactIndex >= 0 ? compactIndex + 1 : 1)
  const attributes = trailingWords.filter((word, index) =>
    ignoredQualifiers.has(word.toLocaleUpperCase('pt-BR')) ||
    (index > 0 && trailingWords[index - 1]?.toLocaleUpperCase('pt-BR') === 'TIPO') ||
    /^\d+$/u.test(word),
  )
  const descriptiveName = compactIndex >= 0 ? productWord : words.join(' ')
  const canonicalName = [descriptiveName, measureLabel].filter(Boolean).join(' ') || productName
  const ranked = rankCatalog(productName, canonicalName)
  const bestScore = ranked[0]?.score ?? 0
  const suggestions = ranked.filter(({ score }) => score >= Math.max(0.35, bestScore - 0.12)).slice(0, 6).map(({ name }) => name)
  const matchedProduct = bestScore >= 0.8 && (ranked[1]?.score ?? 0) < bestScore - 0.08
    ? ranked[0]?.name
    : undefined

  return {
    rawName,
    productName,
    canonicalName: canonicalName.toLocaleUpperCase('pt-BR'),
    quantity,
    unit,
    attributes,
    matchedProduct,
    suggestions,
    ambiguous: suggestions.length > 1 && !matchedProduct,
  }
}

function rankCatalog(productName: string, canonicalName: string): Array<{ name: string; score: number }> {
  const sourceTokens = new Set(searchable(`${productName} ${canonicalName}`).split(' ').filter(Boolean))
  return PRODUCT_CATALOG.map((name) => {
    const catalogTokens = new Set(searchable(name).split(' ').filter(Boolean))
    const overlap = [...sourceTokens].filter((token) => catalogTokens.has(token)).length
    const score = overlap / Math.max(sourceTokens.size, catalogTokens.size)
    return { name, score }
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'pt-BR'))
}

function normalizeDisplayName(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function searchable(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('pt-BR').replace(/[^A-Z0-9]+/gu, ' ').trim()
}

function normalizeUnit(value?: string): ProductResolution['unit'] {
  const unit = value?.toLocaleUpperCase('pt-BR')
  if (unit === 'UNIDADE' || unit === 'UNIDADES') return 'UN'
  if (unit === 'G' || unit === 'KG' || unit === 'ML' || unit === 'L' || unit === 'UN') return unit
  return undefined
}
