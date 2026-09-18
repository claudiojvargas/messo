export type Product = {
  id: string
  name: string
  unitPriceCents: number
  quantity: number
}

export type ProductDetails = Pick<Product, 'name' | 'unitPriceCents'>

export function normalizeProductName(name: string): string | null {
  const normalizedName = name.trim()
  return normalizedName.length > 0 ? normalizedName : null
}

export function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false

  const product = value as Record<string, unknown>
  return (
    typeof product.id === 'string' &&
    product.id.length > 0 &&
    typeof product.name === 'string' &&
    normalizeProductName(product.name) === product.name &&
    Number.isSafeInteger(product.unitPriceCents) &&
    (product.unitPriceCents as number) > 0 &&
    Number.isSafeInteger(product.quantity) &&
    (product.quantity as number) >= 1
  )
}
