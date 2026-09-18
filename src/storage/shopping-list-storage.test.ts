import { describe, expect, it } from 'vitest'
import { loadShoppingList, saveShoppingList, SHOPPING_LIST_STORAGE_KEY } from './shopping-list-storage'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('shopping list storage', () => {
  it('salva e restaura uma lista válida na chave versionada', () => {
    const storage = createStorage()
    const products = [
      { id: '3', name: 'Café', unitPriceCents: 1890, quantity: 1 },
      { id: '2', name: 'Leite', unitPriceCents: 450, quantity: 2 },
      { id: '1', name: 'Arroz', unitPriceCents: 1299, quantity: 1 },
    ]

    saveShoppingList(products, storage)

    expect(storage.getItem(SHOPPING_LIST_STORAGE_KEY)).not.toBeNull()
    expect(loadShoppingList(storage)).toEqual(products)
  })

  it.each([
    'texto quebrado',
    '{}',
    '[{"id":"1"}]',
    '[{"id":"1","name":"Arroz","unitPriceCents":1299,"quantity":0}]',
  ])('ignora conteúdo corrompido ou inesperado: %s', (storedValue: string) => {
    const storage = createStorage()
    storage.setItem(SHOPPING_LIST_STORAGE_KEY, storedValue)
    expect(loadShoppingList(storage)).toEqual([])
  })
})
