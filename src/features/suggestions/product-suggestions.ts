export interface ProductSuggestionOptions {
  catalog: readonly string[]
  currentProducts?: readonly string[]
  limit?: number
}

const MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT = 6

export function findProductSuggestions(
  query: string,
  { catalog, currentProducts = [], limit = DEFAULT_LIMIT }: ProductSuggestionOptions,
): string[] {
  const normalizedQuery = normalizeForSearch(query)
  if (normalizedQuery.length < MIN_QUERY_LENGTH || limit <= 0) return []

  const uniqueNames = new Map<string, string>()
  for (const name of [...currentProducts, ...catalog]) {
    const normalizedName = normalizeForSearch(name)
    if (normalizedName && !uniqueNames.has(normalizedName)) uniqueNames.set(normalizedName, name.trim())
  }

  return [...uniqueNames.entries()]
    .filter(([normalizedName]) => normalizedName.includes(normalizedQuery))
    .sort(([leftKey, leftName], [rightKey, rightName]) => {
      const prefixDifference = Number(rightKey.startsWith(normalizedQuery)) - Number(leftKey.startsWith(normalizedQuery))
      return prefixDifference || leftName.localeCompare(rightName, 'pt-BR', { sensitivity: 'base' })
    })
    .slice(0, limit)
    .map(([, name]) => name)
}

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
}
