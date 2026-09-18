(() => {
  let storedTheme = null
  try {
    storedTheme = localStorage.getItem('messo.theme.v1')
  } catch {
    // A preferência do sistema ainda pode ser aplicada sem armazenamento.
  }
  const theme = storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
})()
