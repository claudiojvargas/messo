import { isProduct, type Product } from '../features/shopping-list/product'

export const SHOPPING_LIST_STORAGE_KEY = 'messo.shopping-list.v1'

export function loadShoppingList(storage: Storage = localStorage): Product[] {
  try {
    const storedValue = storage.getItem(SHOPPING_LIST_STORAGE_KEY)
    if (storedValue === null) return []

    const parsed: unknown = JSON.parse(storedValue)
    if (!Array.isArray(parsed) || !parsed.every(isProduct)) return []

    const ids = parsed.map((product) => product.id)
    return new Set(ids).size === ids.length ? parsed : []
  } catch {
    return []
  }
}

export function saveShoppingList(products: readonly Product[], storage: Storage = localStorage): void {
  try {
    storage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(products))
  } catch {
    // A lista continua disponível durante a sessão se o armazenamento estiver indisponível.
  }
}
