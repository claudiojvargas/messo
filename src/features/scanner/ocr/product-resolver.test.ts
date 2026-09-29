import { describe, expect, it } from 'vitest'
import { resolveProduct } from './product-resolver'

describe('resolveProduct', () => {
  it.each([
    ['ARROZ CAMIL TIPO 1 5KG', 'ARROZ 5KG'],
    ['MACARRAO ABC 750G', 'MACARRAO 750G'],
    ['LEITE INTEGRAL 1L', 'LEITE 1L'],
  ])('creates an editable canonical name for %s', (rawName, canonicalName) => {
    expect(resolveProduct(rawName).canonicalName).toBe(canonicalName)
  })

  it('preserves raw and resolved domain information', () => {
    const resolution = resolveProduct('  ARROZ CAMIL TIPO 1 5KG  ')

    expect(resolution).toMatchObject({
      rawName: '  ARROZ CAMIL TIPO 1 5KG  ',
      productName: 'ARROZ CAMIL TIPO 1 5KG',
      canonicalName: 'ARROZ 5KG',
      quantity: 5,
      unit: 'KG',
    })
    expect(resolution.attributes).toEqual(expect.arrayContaining(['TIPO', '1']))
    expect(Array.isArray(resolution.suggestions)).toBe(true)
    expect(typeof resolution.ambiguous).toBe('boolean')
  })

  it('still fills a canonical name when there is no catalog match', () => {
    const resolution = resolveProduct('MACARRAO ABC 750G')

    expect(resolution.canonicalName).toBe('MACARRAO 750G')
    expect(resolution.matchedProduct).toBeUndefined()
  })

  it('keeps a descriptive name for product families without a compact rule', () => {
    expect(resolveProduct('QUEIJO MUSSARELA 500G').canonicalName).toBe('QUEIJO MUSSARELA 500G')
  })
})
