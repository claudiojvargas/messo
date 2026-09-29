import './styles/main.css'
import { mountShoppingList } from './features/shopping-list/shopping-list-view'
import { initializeInstallPrompt } from './ui/install-prompt'
import { initializePwa } from './ui/pwa'
import { initializeTheme } from './ui/theme'
import { mountLandingPage } from './features/landing/landing-view'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

const isApplicationRoute = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/')

if (!isApplicationRoute) {
  document.body.classList.add('landing-page')
  mountLandingPage(app)
} else {
  document.title = 'Messo — Minha compra'
  mountShoppingList(app)

  const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle')
  const installButton = document.querySelector<HTMLButtonElement>('#install-button')
  const updateButton = document.querySelector<HTMLButtonElement>('#update-button')

  if (!themeButton || !installButton || !updateButton) {
    throw new Error('Controles globais da aplicação não encontrados.')
  }

  initializeTheme(themeButton)
  initializeInstallPrompt(installButton)
  initializePwa(updateButton)
}
