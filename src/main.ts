import './styles/main.css'
import { mountShoppingList } from './features/shopping-list/shopping-list-view'
import { initializeInstallPrompt } from './ui/install-prompt'
import { initializePwa } from './ui/pwa'
import { initializeTheme } from './ui/theme'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

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
