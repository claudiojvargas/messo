import { describe, expect, it } from 'vitest'
import { getInitialTheme, readStoredTheme, THEME_STORAGE_KEY } from './theme'

function storageWith(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: (key) => key === THEME_STORAGE_KEY ? value : null }
}

describe('theme preference', () => {
  it.each(['light', 'dark'] as const)('reads the stored %s theme', (theme: 'light' | 'dark') => {
    expect(readStoredTheme(storageWith(theme))).toBe(theme)
  })

  it('ignores an invalid stored preference', () => {
    expect(readStoredTheme(storageWith('sepia'))).toBeNull()
  })

  it('uses the system preference when there is no manual preference', () => {
    expect(getInitialTheme(storageWith(null), true)).toBe('dark')
    expect(getInitialTheme(storageWith(null), false)).toBe('light')
  })

  it('gives the manual preference priority over the system', () => {
    expect(getInitialTheme(storageWith('light'), true)).toBe('light')
  })
})
