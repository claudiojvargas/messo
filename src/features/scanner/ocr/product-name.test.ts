import { describe, expect, it } from 'vitest'
import { extractProductName } from './product-name'

describe('extractProductName', () => {
  it('combines useful product lines and removes the price', () => {
    expect(extractProductName('CAFÉ MELITTA\nEXTRAFORTE\n500G\nR$ 12,99'))
      .toBe('CAFÉ MELITTA EXTRAFORTE 500G')
  })

  it('removes promotion and old/new price lines', () => {
    const text = 'OFERTA\nCAFÉ MELITTA\nEXTRAFORTE\n500G\nDE R$ 16,90\nPOR R$ 12,99'
    expect(extractProductName(text)).toBe('CAFÉ MELITTA EXTRAFORTE 500G')
  })

  it('removes a barcode while preserving volume', () => {
    expect(extractProductName('LEITE INTEGRAL\n1L\n7891234567890\nR$ 4,99'))
      .toBe('LEITE INTEGRAL 1L')
  })

  it('ignores an isolated promotional percentage', () => {
    expect(extractProductName('20% OFF\nCHOCOLATE AO LEITE\n90G\nR$ 7,99'))
      .toBe('CHOCOLATE AO LEITE 90G')
  })

  it('removes an administrative label and date', () => {
    const text = 'IOGURTE NATURAL\n170G\nVALIDADE\n10/09/2026\nR$ 3,49'
    expect(extractProductName(text)).toBe('IOGURTE NATURAL 170G')
  })

  it('preserves DE when it belongs to the product name', () => {
    expect(extractProductName('LEITE DE COCO\n200ML\nR$ 5,99')).toBe('LEITE DE COCO 200ML')
  })

  it('returns null when only noise remains', () => {
    expect(extractProductName('OFERTA\nR$ 12,99\n20% OFF\n7891234567890')).toBeNull()
  })

  it('normalizes empty lines, tabs, CRLF and repeated spaces', () => {
    const text = '\r\n  CAFÉ   MELITTA \r\n\tEXTRAFORTE\t\r\n 500 G \r\n\r\n'
    expect(extractProductName(text)).toBe('CAFÉ MELITTA EXTRAFORTE 500 G')
  })

  it('removes a generic store header and preserves the compact product block', () => {
    const text = [
      'SUPERMERCADO EXEMPLO',
      'OFERTA',
      'CAFÉ MELITTA',
      'EXTRAFORTE',
      '500 G',
      'COD 12345',
      'DE R$ 16,90',
      'POR R$ 12,99',
      '7891021001234',
    ].join('\n')

    expect(extractProductName(text)).toBe('CAFÉ MELITTA EXTRAFORTE 500 G')
  })

  it('works without a recognized price', () => {
    expect(extractProductName('CAFÉ MELITTA\nEXTRAFORTE\n500G'))
      .toBe('CAFÉ MELITTA EXTRAFORTE 500G')
  })

  it('removes a promotional prefix without discarding useful text', () => {
    expect(extractProductName('Oferta CAFÉ MELITTA\n500G\nR$ 12,99'))
      .toBe('CAFÉ MELITTA 500G')
  })

  it('preserves a percentage that is part of a product description', () => {
    expect(extractProductName('CHOCOLATE 70% CACAU\n90G\nR$ 9,99'))
      .toBe('CHOCOLATE 70% CACAU 90G')
  })

  it('prioritizes the product title on a real weighted-product label', () => {
    const text = [
      'PAO CASEIRINHO Kg ASUN',
      'LOTE/DATA: 10/08/26',
      'VALIDADE: 11/08/26',
      'PESO: 1.068Kg',
      'R$/kg: 15,90',
      'TOTAL R$',
      '16,98',
      '2 351800 016981',
      'FARINHA DE TRIGO FAR SOJA SAL FERMENTO BIOLOGICO',
    ].join('\n')

    expect(extractProductName(text)).toBe('PAO CASEIRINHO Kg ASUN')
  })

  it('rejects imperfectly recognized administrative labels', () => {
    const text = [
      'PAO CASEIRINHO Kg ASUN',
      'DOTE/DATA: 10/08/26',
      'VAL1DADE: 11/08/26',
      'PES0: 1.068Kg',
      'R$/Kg: 15,90',
      'TOTAL R$',
      '16,98',
      '2 351800 016981',
    ].join('\n')

    expect(extractProductName(text)).toBe('PAO CASEIRINHO Kg ASUN')
  })

  it.each([
    ['ARROZ TIPO 1\n5KG\nLOTE 1234\nR$ 29,90', 'ARROZ TIPO 1 5KG'],
    ['COCA COLA\n2L\nCOD 123\nR$ 8,99', 'COCA COLA 2L'],
    ['QUEIJO MUSSARELA\nPESO 0,842KG\nR$/KG 39,90\nTOTAL R$ 33,60', 'QUEIJO MUSSARELA'],
    ['BANANA PRATA\nPESO 1,204KG\nR$/KG 6,99\nTOTAL R$ 8,42', 'BANANA PRATA'],
  ])('handles shelf and weighted-product labels', (text: string, expected: string) => {
    expect(extractProductName(text)).toBe(expected)
  })

  it('does not accept a standalone measure as a product name', () => {
    expect(extractProductName('500G')).toBeNull()
  })
})
