import { describe, expect, it } from 'vitest'
import { formatCurrency, parsePrice, parsePriceToCents } from './price'

describe('parsePriceToCents', () => {
  it.each([
    ['12', 1200],
    ['12,9', 1290],
    ['12,99', 1299],
    ['12.99', 1299],
    ['1.234,56', 123456],
  ])('interpreta %s como %i centavos', (input: string, expected: number) => {
    expect(parsePriceToCents(input)).toBe(expected)
  })

  it.each(['', 'abc', '12abc', '0', '-10'])('rejeita o valor inválido %j', (input: string) => {
    expect(parsePriceToCents(input)).toBeNull()
  })

  it('diferencia preço não positivo de texto inválido', () => {
    expect(parsePrice('0')).toEqual({ ok: false, reason: 'non-positive' })
    expect(parsePrice('12abc')).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('formatCurrency', () => {
  it('formata centavos em reais usando pt-BR', () => {
    expect(formatCurrency(1299).replace(/\u00a0/g, ' ')).toBe('R$ 12,99')
  })
})
