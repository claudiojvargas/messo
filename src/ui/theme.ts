export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'messo.theme.v1'

export function readStoredTheme(storage: Pick<Storage, 'getItem'>): Theme | null {
  try {
    const storedTheme = storage.getItem(THEME_STORAGE_KEY)
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null
  } catch {
    return null
  }
}

export function getInitialTheme(storage: Pick<Storage, 'getItem'>, prefersDark: boolean): Theme {
  return readStoredTheme(storage) ?? (prefersDark ? 'dark' : 'light')
}

export function initializeTheme(button: HTMLButtonElement): void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  let theme = getInitialTheme(localStorage, mediaQuery.matches)

  const applyTheme = (nextTheme: Theme): void => {
    theme = nextTheme
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    button.setAttribute('aria-label', theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro')
    button.setAttribute('aria-pressed', String(theme === 'dark'))
    const icon = button.querySelector<HTMLElement>('[data-theme-icon]')
    if (icon) icon.innerHTML = theme === 'dark' ? sunIcon : moonIcon
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c2922' : '#196b52')
  }

  button.addEventListener('click', () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // O tema ainda funciona durante a sessão quando o armazenamento não está disponível.
    }
  })

  const followSystemTheme = (event: MediaQueryListEvent): void => {
    if (readStoredTheme(localStorage) === null) applyTheme(event.matches ? 'dark' : 'light')
  }
  mediaQuery.addEventListener('change', followSystemTheme)
  applyTheme(theme)
}

const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" stroke-linejoin="round"/></svg>'
const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" stroke-linecap="round"/></svg>'
