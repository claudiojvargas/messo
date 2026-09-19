import { describe, expect, it } from 'vitest'
import { extractPriceCandidates } from './price-candidates'

describe('extractPriceCandidates', () => {
  it.each([
    ['R$ 12,99', 1299],
    ['R$12,99', 1299],
    ['12,99', 1299],
    ['12.99', 1299],
    ['1.234,56', 123456],
    ['R$ 1.234,56', 123456],
    ['Oferta R$ 12 , 99', 1299],
  ])('extracts %s as %i cents', (text: string, expected: number) => {
    expect(extractPriceCandidates(text).map(({ valueCents }) => valueCents)).toEqual([expected])
  })

  it('keeps multiple prices for the user to choose', () => {
    const candidates = extractPriceCandidates('DE R$ 15,99\nPOR R$ 12,99')

    expect(candidates.map(({ valueCents }) => valueCents)).toEqual([1599, 1299])
    expect(candidates.map(({ line }) => line)).toEqual(['DE R$ 15,99', 'POR R$ 12,99'])
  })

  it('deduplicates equivalent monetary values', () => {
    const candidates = extractPriceCandidates('R$ 12,99\n12,99\nR$12,99')
    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.valueCents).toBe(1299)
  })

  it.each(['500 g', '20%', '7891234567890', 'Validade 10/09/2026'])('rejects obvious non-prices: %s', (text: string) => {
    expect(extractPriceCandidates(text)).toEqual([])
  })

  it('extracts only the price from a realistic label', () => {
    const text = 'CAFÉ TORRADO 500 g\nDESCONTO 20%\n7891234567890\nPOR R$ 18,90'
    expect(extractPriceCandidates(text).map(({ valueCents }) => valueCents)).toEqual([1890])
  })

  it('does not interpret a measured weight as a price', () => {
    const text = 'PESO: 1.068kg\nPES0: 0,842KG\nTOTAL R$\n16,98'
    expect(extractPriceCandidates(text).map(({ valueCents }) => valueCents)).toEqual([1698])
  })

  it('keeps price per kilogram and total available for explicit confirmation', () => {
    const text = 'PESO: 1.068kg\nR$/kg: 15,90\nTOTAL R$\n16,98'
    expect(extractPriceCandidates(text).map(({ valueCents }) => valueCents)).toEqual([1590, 1698])
  })
})
