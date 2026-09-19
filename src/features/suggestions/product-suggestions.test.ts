import { describe, expect, it } from 'vitest'
import { findProductSuggestions } from './product-suggestions'

const catalog = ['Café em pó 500g', 'Café solúvel', 'Açúcar refinado', 'Bolo de café', 'Leite integral']

describe('findProductSuggestions', () => {
  it('finds partial matches without distinguishing case or accents', () => {
    expect(findProductSuggestions('CAFE', { catalog })).toEqual([
      'Café em pó 500g',
      'Café solúvel',
      'Bolo de café',
    ])
  })

  it('prioritizes names that start with the query', () => {
    expect(findProductSuggestions('cafe', { catalog })[0]).toBe('Café em pó 500g')
    expect(findProductSuggestions('cafe', { catalog })[1]).toBe('Café solúvel')
  })

  it('deduplicates normalized names while preserving their original spelling', () => {
    expect(findProductSuggestions('cafe', {
      catalog: ['Café em pó 500g'],
      currentProducts: ['  CAFÉ EM PÓ 500G  ', 'Café especial'],
    })).toEqual(['CAFÉ EM PÓ 500G', 'Café especial'])
  })

  it('includes names from the current shopping list', () => {
    expect(findProductSuggestions('banana', { catalog, currentProducts: ['Banana prata'] }))
      .toEqual(['Banana prata'])
  })

  it('respects the result limit', () => {
    expect(findProductSuggestions('ca', { catalog, limit: 2 })).toHaveLength(2)
  })

  it('returns no results below two characters or without matches', () => {
    expect(findProductSuggestions('c', { catalog })).toEqual([])
    expect(findProductSuggestions('produto inexistente', { catalog })).toEqual([])
  })
})
