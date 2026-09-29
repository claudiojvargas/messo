import { describe, expect, it } from 'vitest'
import { normalizeMoneyToCents, parseLabel, weightedTotalMatches } from './label-parser'
import type { OcrLine } from './ocr-types'

describe('label parser', () => {
  it.each([
    ['R$ 9,99', 999],
    ['9,99', 999],
    ['12.90', 1290],
    ['129,90', 12990],
    ['R$12,99', 1299],
  ])('normalizes %s to integer cents', (source, expected) => {
    expect(normalizeMoneyToCents(source)).toBe(expected)
  })

  it('keeps an unqualified price as unknown instead of inventing a type', () => {
    const parsed = parseLabel({ text: 'CAFÉ MELITTA\n500G\nR$ 18,99' })

    expect(parsed.product?.name).toBe('CAFÉ MELITTA 500G')
    expect(parsed.prices).toMatchObject([{ valueCents: 1899, type: 'UNKNOWN' }])
    expect(parsed.prices[0]?.confidence).toBeLessThan(parsed.product?.confidence ?? 0)
  })

  it('classifies regular and promotional prices from explicit context', () => {
    const parsed = parseLabel({ text: 'CAFÉ MELITTA\nDE R$ 18,99\nPOR R$ 15,99' })

    expect(parsed.prices).toMatchObject([
      { valueCents: 1899, type: 'REGULAR_PRICE' },
      { valueCents: 1599, type: 'PROMOTIONAL_PRICE' },
    ])
  })

  it('recognizes price per kg without treating weight as money', () => {
    const parsed = parseLabel({ text: 'PATINHO BOVINO\nR$ 39,90 / KG\nPeso 0,742 KG' })

    expect(parsed.prices).toMatchObject([{ valueCents: 3990, type: 'PRICE_PER_KG', unit: 'KG' }])
    expect(parsed.weight).toMatchObject({ value: 0.742, unit: 'KG' })
  })

  it('recognizes price per 100g and unit price', () => {
    const parsed = parseLabel({ text: 'PRESUNTO\nR$ 4,99 / 100 G\nSABONETE\nR$ 2,49 CADA' })

    expect(parsed.prices).toMatchObject([
      { type: 'PRICE_PER_100G', unit: '100G' },
      { type: 'UNIT_PRICE', unit: 'UNIT' },
    ])
  })

  it('recognizes a weighted total and reinforces a mathematically consistent interpretation', () => {
    const parsed = parseLabel({
      text: 'PATINHO BOVINO\nR$ 39,90 / KG\nPeso 0,742 KG\nTotal R$ 29,61',
    })

    expect(parsed.prices).toMatchObject([
      { valueCents: 3990, type: 'PRICE_PER_KG' },
      { valueCents: 2961, type: 'WEIGHTED_TOTAL' },
    ])
    expect(parsed.warnings).toEqual([])
    expect(parsed.prices.every(({ confidence }) => confidence >= 0.9)).toBe(true)
  })

  it('warns and lowers confidence when kg price, weight and total disagree', () => {
    const parsed = parseLabel({
      text: 'PATINHO BOVINO\nR$ 39,90 / KG\nPeso 0,742 KG\nTotal R$ 28,61',
    })

    expect(parsed.warnings).toHaveLength(1)
    expect(parsed.overallConfidence).toBeLessThan(0.6)
  })

  it('uses the applied promotional kg price to validate a weighed label', () => {
    const parsed = parseLabel({
      text: 'QUEIJO MUSSARELA\nDE R$ 49,90 / KG\nOFERTA\nR$ 39,90 / KG\nPeso 0,742 KG\nTOTAL\nR$ 29,61',
    })

    expect(parsed.prices).toMatchObject([
      { valueCents: 4990, type: 'REGULAR_PRICE', unit: 'KG' },
      { valueCents: 3990, type: 'PROMOTIONAL_PRICE', unit: 'KG' },
      { valueCents: 2961, type: 'WEIGHTED_TOTAL' },
    ])
    expect(parsed.warnings).toEqual([])
    expect(parsed.prices[1]?.confidence).toBe(1)
  })

  it('preserves membership and minimum-quantity promotion conditions', () => {
    const membership = parseLabel({
      text: 'CAFÉ MELITTA\nPREÇO NORMAL\nR$ 18,99\nCLUBE\nR$ 15,99',
    })
    const quantity = parseLabel({ text: 'R$ 9,99\nA PARTIR DE 3 UNIDADES' })

    expect(membership.prices[1]).toMatchObject({
      type: 'PROMOTIONAL_PRICE',
      promotion: { condition: 'MEMBERSHIP' },
    })
    expect(quantity.prices[0]).toMatchObject({
      type: 'PROMOTIONAL_PRICE',
      promotion: { condition: 'MIN_QUANTITY', minimumQuantity: 3 },
    })
  })

  it('uses layout, uppercase text and OCR confidence when scoring the product', () => {
    const lines: OcrLine[] = [
      line('PATINHO BOVINO', 50, 20, 300, 60, 92),
      line('R$ 39,90 / KG', 50, 120, 180, 25, 88),
      line('PESO 0,742 KG', 50, 170, 160, 20, 85),
    ]
    const parsed = parseLabel({ text: lines.map(({ text }) => text).join('\n'), lines })

    expect(parsed.product).toEqual({ name: 'PATINHO BOVINO', confidence: 1 })
  })

  it('uses a tolerance instead of exact floating-point equality', () => {
    expect(weightedTotalMatches(3990, 0.742, 2961)).toBe(true)
    expect(weightedTotalMatches(3990, 0.742, 2861)).toBe(false)
  })
})

function line(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  confidence: number,
): OcrLine {
  return { text, confidence, boundingBox: { x0: x, y0: y, x1: x + width, y1: y + height } }
}
