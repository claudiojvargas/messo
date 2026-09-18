import './styles/main.css'
import { renderShoppingList } from './features/shopping-list/shopping-list'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

renderShoppingList(app)
