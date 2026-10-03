import type { Product, ProductDetails } from './product'
import { normalizeProductName } from './product'
import { formatCentsForInput, formatCurrency, parsePrice } from './price'
import {
  addProduct,
  changeProductQuantity,
  clearShoppingList,
  editProduct,
  getProductSubtotal,
  getTotalCents,
  getTotalQuantity,
  removeProduct,
} from './shopping-list'
import { loadShoppingList, saveShoppingList } from '../../storage/shopping-list-storage'
import { showToast } from '../../ui/toast'
import { scanPrice } from '../scanner/scan-price'
import { confirmClearShoppingList } from './clear-list-dialog'
import { mountProductSuggestions } from '../suggestions/suggestions-view'
import { productIconTemplate } from './product-icon'

export function mountShoppingList(container: HTMLElement): void {
  container.innerHTML = pageTemplate()

  const form = requireElement<HTMLFormElement>(container, '#product-form')
  const nameInput = requireElement<HTMLInputElement>(container, '#product-name')
  const priceInput = requireElement<HTMLInputElement>(container, '#product-price')
  const nameError = requireElement<HTMLElement>(container, '#product-name-error')
  const priceError = requireElement<HTMLElement>(container, '#product-price-error')
  const list = requireElement<HTMLElement>(container, '#shopping-list-content')
  const listCount = requireElement<HTMLElement>(container, '#list-count')
  const summaryTotal = requireElement<HTMLElement>(container, '#summary-total')
  const cameraButton = requireElement<HTMLButtonElement>(container, '#camera-button')
  const panelCameraButton = requireElement<HTMLButtonElement>(container, '#panel-camera-button')
  const openPanelButton = requireElement<HTMLButtonElement>(container, '#open-add-panel')
  const closePanelButton = requireElement<HTMLButtonElement>(container, '#close-add-panel')
  const panel = requireElement<HTMLElement>(container, '#add-product-panel')
  const clearListButton = requireElement<HTMLButtonElement>(container, '#clear-list-button')

  let products = loadShoppingList()
  let editingId: string | null = null
  const suggestions = mountProductSuggestions({
    input: nameInput,
    list: requireElement<HTMLElement>(container, '#product-suggestions'),
    getCurrentProductNames: () => products.map(({ name }) => name),
  })

  const render = (): void => {
    const quantity = getTotalQuantity(products)
    const quantityLabel = formatQuantity(quantity)
    listCount.textContent = quantityLabel
    summaryTotal.textContent = formatCurrency(getTotalCents(products))
    clearListButton.hidden = products.length === 0
    list.innerHTML = products.length === 0 ? emptyStateTemplate() : products.map((product) => productTemplate(product, editingId === product.id)).join('')
  }

  const commit = (nextProducts: Product[]): void => {
    products = nextProducts
    saveShoppingList(products)
    render()
  }

  const addProductToShoppingList = (details: ProductDetails): void => {
    commit(addProduct(products, details))
    list.scrollTop = 0
    showToast('Produto adicionado.')
  }

  const openPanel = (focusInput = true): void => {
    panel.hidden = false
    panel.setAttribute('aria-hidden', 'false')
    if (focusInput) requestAnimationFrame(() => nameInput.focus({ preventScroll: true }))
  }

  const closePanel = (): void => {
    suggestions.close()
    panel.hidden = true
    panel.setAttribute('aria-hidden', 'true')
    openPanelButton.focus({ preventScroll: true })
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    clearAddErrors(nameInput, priceInput, nameError, priceError)

    const details = readProductDetails(nameInput.value, priceInput.value)
    if (!details.ok) {
      showAddErrors(details, nameInput, priceInput, nameError, priceError)
      return
    }

    addProductToShoppingList(details.value)
    suggestions.close()
    form.reset()
    closePanel()
  })

  list.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-action]') : null
    if (!button) return
    const item = button.closest<HTMLElement>('[data-product-id]')
    const id = item?.dataset.productId
    if (!id) return
    const product = products.find((candidate) => candidate.id === id)
    if (!product) return

    switch (button.dataset.action) {
      case 'increase':
        commit(changeProductQuantity(products, id, product.quantity + 1))
        break
      case 'decrease':
        if (product.quantity > 1) commit(changeProductQuantity(products, id, product.quantity - 1))
        break
      case 'edit':
        editingId = id
        render()
        requireElement<HTMLInputElement>(list, `[data-edit-name="${CSS.escape(id)}"]`).focus()
        break
      case 'cancel-edit':
        editingId = null
        render()
        break
      case 'remove':
        if (editingId === id) editingId = null
        commit(removeProduct(products, id))
        showToast('Produto removido.')
        break
    }
  })

  list.addEventListener('submit', (event) => {
    const editForm = event.target
    if (!(editForm instanceof HTMLFormElement) || !editForm.matches('[data-edit-form]')) return
    event.preventDefault()

    const id = editForm.dataset.editForm
    const editName = editForm.elements.namedItem('edit-name')
    const editPrice = editForm.elements.namedItem('edit-price')
    const editError = editForm.querySelector<HTMLElement>('[data-edit-error]')
    if (!id || !(editName instanceof HTMLInputElement) || !(editPrice instanceof HTMLInputElement) || !editError) return

    const details = readProductDetails(editName.value, editPrice.value)
    if (!details.ok) {
      editError.textContent = details.nameError ?? details.priceError ?? 'Revise os dados informados.'
      editName.setAttribute('aria-invalid', String(Boolean(details.nameError)))
      editPrice.setAttribute('aria-invalid', String(Boolean(details.priceError)))
      const invalidInput = details.nameError ? editName : editPrice
      invalidInput.focus()
      return
    }

    editingId = null
    commit(editProduct(products, id, details.value))
    showToast('Produto atualizado.')
  })

  const startScanner = async (trigger: HTMLButtonElement): Promise<void> => {
    trigger.disabled = true
    trigger.setAttribute('aria-busy', 'true')
    try {
      const result = await scanPrice(trigger)
      if (result.status === 'product') {
        nameInput.value = result.name
        priceInput.value = formatCentsForInput(result.unitPriceCents)
        openPanel(false)
        priceInput.focus({ preventScroll: true })
      } else if (result.status === 'manual') {
        openPanel()
      }
    } finally {
      trigger.disabled = false
      trigger.removeAttribute('aria-busy')
    }
  }

  openPanelButton.addEventListener('click', () => openPanel())
  closePanelButton.addEventListener('click', closePanel)
  cameraButton.addEventListener('click', () => void startScanner(cameraButton))
  panelCameraButton.addEventListener('click', () => void startScanner(panelCameraButton))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden && !document.querySelector('dialog[open]')) closePanel()
  })

  clearListButton.addEventListener('click', async () => {
    const quantity = getTotalQuantity(products)
    if (quantity === 0) return

    const confirmed = await confirmClearShoppingList(quantity, clearListButton)
    if (!confirmed) return

    editingId = null
    commit(clearShoppingList(products))
    showToast('Lista limpa.')
  })

  render()
}

type DetailsResult =
  | { ok: true; value: ProductDetails }
  | { ok: false; nameError?: string; priceError?: string }

function readProductDetails(nameValue: string, priceValue: string): DetailsResult {
  const name = normalizeProductName(nameValue)
  const parsedPrice = parsePrice(priceValue)
  if (name && parsedPrice.ok) return { ok: true, value: { name, unitPriceCents: parsedPrice.cents } }

  return {
    ok: false,
    nameError: name ? undefined : 'Informe o nome do produto.',
    priceError: parsedPrice.ok ? undefined : priceErrorMessage(parsedPrice.reason),
  }
}

function priceErrorMessage(reason: 'empty' | 'invalid' | 'non-positive'): string {
  if (reason === 'empty') return 'Informe o preço do produto.'
  if (reason === 'non-positive') return 'Informe um preço maior que zero.'
  return 'Informe um preço válido, como 12,99.'
}

function showAddErrors(
  errors: Extract<DetailsResult, { ok: false }>,
  nameInput: HTMLInputElement,
  priceInput: HTMLInputElement,
  nameError: HTMLElement,
  priceError: HTMLElement,
): void {
  nameError.textContent = errors.nameError ?? ''
  priceError.textContent = errors.priceError ?? ''
  nameInput.setAttribute('aria-invalid', String(Boolean(errors.nameError)))
  priceInput.setAttribute('aria-invalid', String(Boolean(errors.priceError)))
  const invalidInput = errors.nameError ? nameInput : priceInput
  invalidInput.focus()
}

function clearAddErrors(...elements: HTMLElement[]): void {
  for (const element of elements) {
    if (element instanceof HTMLInputElement) element.removeAttribute('aria-invalid')
    else element.textContent = ''
  }
}

function formatQuantity(quantity: number): string {
  return `${quantity} ${quantity === 1 ? 'item' : 'itens'}`
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector)
  if (!element) throw new Error(`Elemento obrigatório não encontrado: ${selector}`)
  return element
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character)
}

function productTemplate(product: Product, isEditing: boolean): string {
  const id = escapeHtml(product.id)
  if (isEditing) {
    return `
      <li class="rounded-2xl border border-brand-700/30 bg-white p-4 shadow-sm dark:bg-stone-900" data-product-id="${id}">
        <form data-edit-form="${id}" novalidate>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Editando produto</p>
          <div class="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div><label class="mb-1.5 block text-sm font-semibold" for="edit-name-${id}">Produto</label><input class="field" id="edit-name-${id}" data-edit-name="${id}" name="edit-name" value="${escapeHtml(product.name)}" autocomplete="off"></div>
            <div><label class="mb-1.5 block text-sm font-semibold" for="edit-price-${id}">Preço</label><input class="field" id="edit-price-${id}" name="edit-price" value="${formatCentsForInput(product.unitPriceCents)}" inputmode="decimal"></div>
          </div>
          <p class="error-message min-h-5" data-edit-error aria-live="polite"></p>
          <div class="mt-2 flex gap-2"><button class="action-button flex-1 bg-brand-700 text-white" type="submit">Salvar</button><button class="action-button flex-1 border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-200" type="button" data-action="cancel-edit">Cancelar</button></div>
        </form>
      </li>`
  }

  return `
    <li class="product-row" data-product-id="${id}">
      ${productIconTemplate(product.name)}
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><h3 class="break-words font-bold leading-tight text-stone-900 dark:text-stone-50">${escapeHtml(product.name)}</h3><p class="mt-1 text-sm text-stone-500 dark:text-stone-400">${formatCurrency(product.unitPriceCents)} cada</p></div>
          <div class="shrink-0 text-right"><p class="text-[0.65rem] font-semibold uppercase tracking-wider text-stone-400">Subtotal</p><p class="mt-0.5 font-extrabold text-brand-800 dark:text-emerald-300">${formatCurrency(getProductSubtotal(product))}</p></div>
        </div>
        <div class="mt-2 flex items-center justify-between gap-2">
          <div class="flex items-center rounded-xl bg-stone-100 dark:bg-stone-800" aria-label="Quantidade de ${escapeHtml(product.name)}">
            <button class="quantity-button" type="button" data-action="decrease" aria-label="Diminuir quantidade de ${escapeHtml(product.name)}" ${product.quantity === 1 ? 'disabled' : ''}>−</button>
            <span class="min-w-8 text-center text-sm font-bold" aria-live="polite">${product.quantity}</span>
            <button class="quantity-button" type="button" data-action="increase" aria-label="Aumentar quantidade de ${escapeHtml(product.name)}">+</button>
          </div>
          <div class="flex gap-1">
            <button class="icon-action text-brand-700 dark:text-emerald-300" type="button" data-action="edit" aria-label="Editar ${escapeHtml(product.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
            <button class="icon-action text-red-700 dark:text-red-300" type="button" data-action="remove" aria-label="Remover ${escapeHtml(product.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg></button>
          </div>
        </div>
      </div>
    </li>`
}

function emptyStateTemplate(): string {
  return `<li class="flex min-h-52 flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-8 text-center dark:border-stone-700 dark:bg-stone-900/70">${productIconTemplate('')}<h3 class="mt-4 font-bold text-stone-800 dark:text-stone-100">Sua compra está vazia</h3><p class="mt-2 max-w-xs text-sm leading-6 text-stone-500 dark:text-stone-400">Adicione manualmente ou escaneie uma etiqueta para começar.</p></li>`
}

function pageTemplate(): string {
  return `
    <div class="app-shell bg-stone-50 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-100">
      <header class="shrink-0 bg-brand-800 text-white dark:bg-[#0c2922]"><div class="mx-auto flex max-w-3xl items-center justify-between px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8"><a class="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" href="#main-content" aria-label="Messo, ir para o conteúdo principal"><img class="h-9 w-auto sm:h-11" src="/images/logo-white.png" alt=""></a><button id="theme-toggle" class="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" type="button" aria-label="Alternar tema"><span class="size-5" data-theme-icon aria-hidden="true"></span></button></div></header>
      <main id="main-content" class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 sm:px-8">
        <button id="install-button" class="mx-auto mb-2 mt-2 block min-h-11 rounded-full border border-brand-700/20 bg-brand-50 px-5 text-sm font-bold text-brand-800 shadow-sm dark:border-emerald-300/20 dark:bg-brand-900 dark:text-emerald-100" type="button" hidden>Instalar Messo</button>
        <section class="flex min-h-0 flex-1 flex-col pt-4" aria-labelledby="shopping-list-title">
          <div class="mb-3 flex shrink-0 items-center justify-between gap-3 px-1"><div class="flex min-w-0 items-center gap-2.5"><h1 id="shopping-list-title" class="text-xl font-extrabold tracking-tight sm:text-2xl">Minha compra</h1><span id="list-count" class="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-emerald-200">0 itens</span></div><button id="clear-list-button" class="min-h-11 shrink-0 rounded-xl px-2 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:text-red-300 dark:hover:bg-red-950/40" type="button" hidden>Limpar lista</button></div>
          <ul id="shopping-list-content" class="grid min-h-0 flex-1 list-none content-start gap-2 overflow-y-auto overscroll-contain px-0 pb-3 pt-0" aria-live="polite"></ul>
          <div class="cart-actions shrink-0"><button id="open-add-panel" class="secondary-cart-button" type="button" aria-controls="add-product-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Adicionar</button><button id="camera-button" class="primary-cart-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1-1.5h6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.25"/></svg>Escanear</button></div>
        </section>
      </main>
      <section id="add-product-panel" class="add-product-panel" role="dialog" aria-modal="false" aria-labelledby="add-product-title" aria-hidden="true" hidden>
        <div class="panel-handle" aria-hidden="true"></div><header class="mb-3 flex items-center justify-between gap-3"><div><h2 id="add-product-title" class="text-xl font-extrabold">Adicionar item</h2><p class="text-sm text-stone-500 dark:text-stone-400">Entrada rápida</p></div><button id="close-add-panel" class="icon-action" type="button" aria-label="Fechar painel de adicionar item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
        <form id="product-form" novalidate><div class="grid gap-3 sm:grid-cols-[1fr_10rem]"><div><label class="mb-1.5 block text-sm font-semibold" for="product-name">Produto</label><div class="relative"><input class="field" id="product-name" name="product-name" type="text" placeholder="Ex.: Banana prata" autocomplete="off" aria-describedby="product-name-error"><ul id="product-suggestions" class="product-suggestions product-suggestions-up" role="listbox" aria-label="Sugestões de produtos" hidden></ul></div><p class="error-message" id="product-name-error" aria-live="polite"></p></div><div><label class="mb-1.5 block text-sm font-semibold" for="product-price">Preço</label><div class="relative"><span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-stone-500" aria-hidden="true">R$</span><input class="field pl-12" id="product-price" name="product-price" type="text" inputmode="decimal" placeholder="0,00" aria-describedby="product-price-error"></div><p class="error-message" id="product-price-error" aria-live="polite"></p></div></div>
          <div class="mt-1 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2"><button id="panel-camera-button" class="secondary-cart-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1-1.5h6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.25"/></svg><span class="hidden min-[360px]:inline">Usar câmera</span><span class="min-[360px]:hidden">Câmera</span></button><button class="primary-cart-button px-2" type="submit">Adicionar ao carrinho</button></div>
        </form>
      </section>
      <button id="update-button" class="fixed bottom-24 left-1/2 z-40 min-h-11 -translate-x-1/2 rounded-full bg-stone-900 px-5 text-sm font-bold text-white shadow-lg dark:bg-white dark:text-stone-900" type="button" hidden>Nova versão disponível — atualizar</button>
      <aside class="total-bar" aria-label="Resumo da compra"><div class="mx-auto flex max-w-3xl items-center justify-between gap-6 px-5 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 sm:px-8"><p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Total da compra</p><p id="summary-total" class="text-2xl font-extrabold tracking-tight">R$ 0,00</p></div></aside>
    </div>`
}
