import { describe, expect, it } from 'vitest'
import { normalizeDetectedProduct, normalizeProductText, resolveProductName } from './product-resolver'

describe('product resolver', () => {
  it.each([
    ['ARROZ CAMIL 5KG', 'ARROZ', 5, 'KG', 'ARROZ 5KG'],
    ['ARROZ TIO JOAO TIPO 1 5 KG', 'ARROZ', 5, 'KG', 'ARROZ 5KG'],
    ['CAFE MELITTA TRADICIONAL 500G', 'CAFE', 500, 'G', 'CAFE 500G'],
    ['ACUCAR UNIAO REFINADO 1KG', 'ACUCAR', 1, 'KG', 'ACUCAR 1KG'],
    ['LEITE ITALAC INTEGRAL 1L', 'LEITE', 1, 'L', 'LEITE 1L'],
  ])('canonicalizes %s without using its brand', (rawName, productName, quantity, unit, canonicalName) => {
    expect(normalizeDetectedProduct(rawName)).toMatchObject({ rawName, productName, quantity, unit, canonicalName })
  })

  it('normalizes accents, punctuation, whitespace and unit aliases', () => {
    expect(normalizeProductText('  Arroz  Camil Tipo 1 - 5 Kg ')).toBe('ARROZ CAMIL TIPO 1 5KG')
    expect(normalizeDetectedProduct('Leite integral, 2 LT')).toMatchObject({
      productName: 'LEITE', quantity: 2, unit: 'L', canonicalName: 'LEITE 2L',
    })
  })

  it('preserves optional attributes without adding them to the primary key', () => {
    expect(normalizeDetectedProduct('ARROZ CAMIL TIPO 1 5KG').attributes).toEqual(['TIPO 1'])
    expect(normalizeDetectedProduct('LEITE ITALAC SEM LACTOSE 1L').attributes).toEqual(['SEM LACTOSE'])
  })

  it('returns a unique exact catalog product', () => {
    expect(resolveProductName('ARROZ CAMIL 5 KG', { catalog: ['Arroz 5kg', 'Feijão 1kg'] })).toMatchObject({
      product: 'Arroz 5kg', ambiguous: false,
    })
  })

  it('does not invent a missing product and suggests compatible catalog entries', () => {
    const result = resolveProductName('MACARRAO ABC 750G', {
      catalog: ['Macarrão 500g', 'Macarrão 1kg', 'Arroz 5kg'],
    })
    expect(result.product).toBeUndefined()
    expect(result.suggestions).toEqual(['Macarrão 500g', 'Macarrão 1kg'])
  })

  it('does not silently accept ambiguous canonical matches', () => {
    const result = resolveProductName('ARROZ CAMIL TIPO 1 5KG', {
      catalog: ['Arroz branco 5kg', 'Arroz tipo 1 5kg'],
    })
    expect(result.product).toBeUndefined()
    expect(result.ambiguous).toBe(true)
  })

  it('handles missing quantity or unit conservatively', () => {
    expect(normalizeDetectedProduct('CAFE MELITTA')).toMatchObject({ canonicalName: 'CAFE' })
    expect(normalizeDetectedProduct('CAFE MELITTA 500')).toMatchObject({ canonicalName: 'CAFE' })
    expect(normalizeDetectedProduct('CAFE MELITTA KG')).toMatchObject({ canonicalName: 'CAFE' })
  })

  it('only suggests a partially incorrect OCR name instead of selecting it', () => {
    const result = resolveProductName('ARR0Z CAMIL 5KG', { catalog: ['Arroz 5kg'] })
    expect(result.product).toBeUndefined()
    expect(result.suggestions).toEqual(['Arroz 5kg'])
  })

  it('preserves rawName exactly', () => {
    const rawName = '  Café Melitta  500 G '
    expect(normalizeDetectedProduct(rawName).rawName).toBe(rawName)
  })
})
