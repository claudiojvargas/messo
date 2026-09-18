import type { Product, ProductDetails } from './product'
import { normalizeProductName } from './product'

export function addProduct(
  products: readonly Product[],
  details: ProductDetails,
  id: string = crypto.randomUUID(),
): Product[] {
  const name = normalizeProductName(details.name)
  assertProductDetails(name, details.unitPriceCents)
  return [...products, { id, name, unitPriceCents: details.unitPriceCents, quantity: 1 }]
}

export function editProduct(
  products: readonly Product[],
  id: string,
  details: ProductDetails,
): Product[] {
  const name = normalizeProductName(details.name)
  assertProductDetails(name, details.unitPriceCents)
  return products.map((product) =>
    product.id === id ? { ...product, name, unitPriceCents: details.unitPriceCents } : product,
  )
}

export function removeProduct(products: readonly Product[], id: string): Product[] {
  return products.filter((product) => product.id !== id)
}

export function changeProductQuantity(
  products: readonly Product[],
  id: string,
  quantity: number,
): Product[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError('A quantidade deve ser um número inteiro maior ou igual a 1.')
  }
  return products.map((product) => (product.id === id ? { ...product, quantity } : product))
}

export function getProductSubtotal(product: Product): number {
  return product.unitPriceCents * product.quantity
}

export function getTotalQuantity(products: readonly Product[]): number {
  return products.reduce((total, product) => total + product.quantity, 0)
}

export function getTotalCents(products: readonly Product[]): number {
  return products.reduce((total, product) => total + getProductSubtotal(product), 0)
}

function assertProductDetails(name: string | null, unitPriceCents: number): asserts name is string {
  if (name === null) throw new Error('O nome do produto é obrigatório.')
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0) {
    throw new RangeError('O preço deve ser um valor positivo em centavos.')
  }
}
