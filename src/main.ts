import './styles/main.css'
import { mountShoppingList } from './features/shopping-list/shopping-list-view'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

mountShoppingList(app)
