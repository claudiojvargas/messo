import { describe, expect, it } from 'vitest'
import {
  addProduct,
  changeProductQuantity,
  editProduct,
  getProductSubtotal,
  getTotalCents,
  getTotalQuantity,
  removeProduct,
} from './shopping-list'

describe('shopping list', () => {
  it('adiciona um produto com nome normalizado e quantidade inicial 1', () => {
    const products = addProduct([], { name: '  Arroz Integral  ', unitPriceCents: 1299 }, 'arroz-id')

    expect(products).toEqual([
      { id: 'arroz-id', name: 'Arroz Integral', unitPriceCents: 1299, quantity: 1 },
    ])
  })

  it('remove um produto pelo identificador', () => {
    const products = addProduct([], { name: 'Leite', unitPriceCents: 450 }, 'leite-id')
    expect(removeProduct(products, 'leite-id')).toEqual([])
  })

  it('altera apenas a quantidade do produto selecionado', () => {
    const products = addProduct([], { name: 'Arroz', unitPriceCents: 1299 }, 'arroz-id')
    const updated = changeProductQuantity(products, 'arroz-id', 2)

    expect(updated[0]?.quantity).toBe(2)
    expect(getProductSubtotal(updated[0]!)).toBe(2598)
  })

  it.each([0, -1, 1.5, Number.NaN])('rejeita quantidade inválida: %s', (quantity: number) => {
    const products = addProduct([], { name: 'Arroz', unitPriceCents: 1299 }, 'arroz-id')
    expect(() => changeProductQuantity(products, 'arroz-id', quantity)).toThrow(RangeError)
  })

  it('edita nome e preço sem alterar id ou quantidade', () => {
    let products = addProduct([], { name: 'Arroz', unitPriceCents: 1299 }, 'arroz-id')
    products = changeProductQuantity(products, 'arroz-id', 2)
    products = editProduct(products, 'arroz-id', { name: 'Arroz integral', unitPriceCents: 1399 })

    expect(products[0]).toEqual({
      id: 'arroz-id',
      name: 'Arroz integral',
      unitPriceCents: 1399,
      quantity: 2,
    })
  })

  it('soma quantidades e calcula o total exclusivamente em centavos', () => {
    let products = addProduct([], { name: 'Produto A', unitPriceCents: 1299 }, 'a')
    products = addProduct(products, { name: 'Produto B', unitPriceCents: 450 }, 'b')
    products = changeProductQuantity(products, 'a', 2)
    products = changeProductQuantity(products, 'b', 3)

    expect(getTotalQuantity(products)).toBe(5)
    expect(getTotalCents(products)).toBe(3948)
  })
})
