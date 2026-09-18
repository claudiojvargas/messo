import type { Product, ProductDetails } from './product'
import { normalizeProductName } from './product'
import { formatCentsForInput, formatCurrency, parsePrice } from './price'
import {
  addProduct,
  changeProductQuantity,
  editProduct,
  getProductSubtotal,
  getTotalCents,
  getTotalQuantity,
  removeProduct,
} from './shopping-list'
import { loadShoppingList, saveShoppingList } from '../../storage/shopping-list-storage'
import { showToast } from '../../ui/toast'
import { scanPrice } from '../scanner/scan-price'

export function mountShoppingList(container: HTMLElement): void {
  container.innerHTML = pageTemplate()

  const form = requireElement<HTMLFormElement>(container, '#product-form')
  const nameInput = requireElement<HTMLInputElement>(container, '#product-name')
  const priceInput = requireElement<HTMLInputElement>(container, '#product-price')
  const nameError = requireElement<HTMLElement>(container, '#product-name-error')
  const priceError = requireElement<HTMLElement>(container, '#product-price-error')
  const list = requireElement<HTMLElement>(container, '#shopping-list-content')
  const listCount = requireElement<HTMLElement>(container, '#list-count')
  const summaryCount = requireElement<HTMLElement>(container, '#summary-count')
  const summaryTotal = requireElement<HTMLElement>(container, '#summary-total')
  const cameraButton = requireElement<HTMLButtonElement>(container, '#camera-button')

  let products = loadShoppingList()
  let editingId: string | null = null

  const render = (): void => {
    const quantity = getTotalQuantity(products)
    const quantityLabel = formatQuantity(quantity)
    listCount.textContent = quantityLabel
    summaryCount.textContent = quantityLabel
    summaryTotal.textContent = formatCurrency(getTotalCents(products))
    list.innerHTML = products.length === 0 ? emptyStateTemplate() : products.map((product) => productTemplate(product, editingId === product.id)).join('')
  }

  const commit = (nextProducts: Product[]): void => {
    products = nextProducts
    saveShoppingList(products)
    render()
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    clearAddErrors(nameInput, priceInput, nameError, priceError)

    const details = readProductDetails(nameInput.value, priceInput.value)
    if (!details.ok) {
      showAddErrors(details, nameInput, priceInput, nameError, priceError)
      return
    }

    commit(addProduct(products, details.value))
    form.reset()
    nameInput.focus()
    showToast('Produto adicionado.')
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

  cameraButton.addEventListener('click', async () => {
    cameraButton.disabled = true
    cameraButton.setAttribute('aria-busy', 'true')
    try {
      const result = await scanPrice(cameraButton)
      if (result.status === 'selected') {
        priceInput.value = formatCentsForInput(result.valueCents)
        priceInput.removeAttribute('aria-invalid')
        priceError.textContent = ''
        if (nameInput.value.trim()) {
          priceInput.focus()
          priceInput.select()
        } else {
          nameInput.focus()
        }
        showToast('Preço preenchido. Confirme os dados do produto.')
      } else if (result.status === 'manual') {
        priceInput.focus()
      }
    } finally {
      cameraButton.disabled = false
      cameraButton.removeAttribute('aria-busy')
    }
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
    <li class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900" data-product-id="${id}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0"><h3 class="break-words font-bold text-stone-900 dark:text-stone-50">${escapeHtml(product.name)}</h3><p class="mt-1 text-sm text-stone-500 dark:text-stone-400">${formatCurrency(product.unitPriceCents)} cada</p></div>
        <div class="shrink-0 text-right"><p class="text-xs font-semibold uppercase tracking-wider text-stone-400">Subtotal</p><p class="mt-1 font-extrabold text-brand-800">${formatCurrency(getProductSubtotal(product))}</p></div>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3 dark:border-stone-800">
        <div class="flex items-center rounded-xl bg-stone-100 p-1 dark:bg-stone-800" aria-label="Quantidade de ${escapeHtml(product.name)}">
          <button class="quantity-button" type="button" data-action="decrease" aria-label="Diminuir quantidade de ${escapeHtml(product.name)}" ${product.quantity === 1 ? 'disabled' : ''}>−</button>
          <span class="min-w-10 text-center text-sm font-bold" aria-live="polite">${product.quantity}</span>
          <button class="quantity-button" type="button" data-action="increase" aria-label="Aumentar quantidade de ${escapeHtml(product.name)}">+</button>
        </div>
        <div class="flex gap-1">
          <button class="action-button text-brand-700 dark:text-emerald-300" type="button" data-action="edit" aria-label="Editar ${escapeHtml(product.name)}">Editar</button>
          <button class="action-button text-red-700 dark:text-red-300" type="button" data-action="remove" aria-label="Remover ${escapeHtml(product.name)}">Remover</button>
        </div>
      </div>
    </li>`
}

function emptyStateTemplate(): string {
  return `<li class="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-10 text-center dark:border-stone-700 dark:bg-stone-900/70"><span class="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-emerald-200" aria-hidden="true"><svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 7h12l-1 13H7L6 7Z" stroke-linejoin="round"/><path d="M9 9V5a3 3 0 0 1 6 0v4" stroke-linecap="round"/></svg></span><h3 class="font-bold text-stone-800 dark:text-stone-100">Nenhum produto adicionado ainda</h3><p class="mt-2 max-w-xs text-sm leading-6 text-stone-500 dark:text-stone-400">Use os campos acima para começar a organizar sua compra.</p></li>`
}

function pageTemplate(): string {
  return `
    <div class="min-h-dvh bg-stone-50 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-100">
      <header class="bg-brand-800 text-white dark:bg-[#0c2922]"><div class="mx-auto flex max-w-3xl items-center justify-between px-5 pb-7 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8"><a class="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" href="#main-content" aria-label="Messo, ir para o conteúdo principal"><span class="grid size-10 place-items-center rounded-xl bg-white/12 shadow-inner ring-1 ring-white/15" aria-hidden="true"><svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19V8.8A2.8 2.8 0 0 1 7.8 6h8.4A2.8 2.8 0 0 1 19 8.8V19" stroke-linecap="round"/><path d="M9 8V5.5a3 3 0 0 1 6 0V8M8 12h8M8 15.5h5" stroke-linecap="round"/></svg></span><span><span class="block text-2xl font-bold leading-none tracking-tight">messo</span><span class="mt-1 block text-[0.68rem] font-medium uppercase tracking-[0.19em] text-emerald-100/80">compras mais leves</span></span></a><button id="theme-toggle" class="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" type="button" aria-label="Alternar tema"><span class="size-5" data-theme-icon aria-hidden="true"></span></button></div></header>
      <main id="main-content" class="mx-auto max-w-3xl px-4 pb-44 sm:px-8">
        <button id="install-button" class="mx-auto mb-5 mt-3 block min-h-11 rounded-full border border-brand-700/20 bg-brand-50 px-5 text-sm font-bold text-brand-800 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 dark:border-emerald-300/20 dark:bg-brand-900 dark:text-emerald-100" type="button" hidden>Instalar Messo</button>
        <section class="relative -mt-3 rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200/60 dark:bg-stone-900 dark:ring-stone-700 sm:p-7" aria-labelledby="add-product-title"><div class="mb-5"><p class="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-emerald-300">Novo item</p><h1 id="add-product-title" class="text-xl font-bold tracking-tight">O que vai para o carrinho?</h1></div>
          <form id="product-form" novalidate><div class="grid gap-3 sm:grid-cols-[1fr_10rem]"><div><label class="mb-2 block text-sm font-semibold text-stone-700" for="product-name">Produto</label><input class="field" id="product-name" name="product-name" type="text" placeholder="Ex.: Arroz integral" autocomplete="off" aria-describedby="product-name-error"><p class="error-message" id="product-name-error" aria-live="polite"></p></div><div><label class="mb-2 block text-sm font-semibold text-stone-700" for="product-price">Preço</label><div class="relative"><span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-stone-500" aria-hidden="true">R$</span><input class="field pl-12" id="product-price" name="product-price" type="text" inputmode="decimal" placeholder="0,00" aria-describedby="product-price-error"></div><p class="error-message" id="product-price-error" aria-live="polite"></p></div></div>
            <div class="mt-2 grid grid-cols-[1fr_auto] gap-3"><button class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 active:translate-y-px" type="submit"><svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>Adicionar</button><button id="camera-button" class="grid size-12 place-items-center rounded-xl border border-stone-200 bg-stone-50 text-brand-700 transition hover:border-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-wait disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-emerald-300" type="button" aria-label="Fotografar etiqueta de preço" title="Fotografar etiqueta"><svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1-1.5h6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.25"/></svg></button></div><p class="mt-3 text-xs leading-relaxed text-stone-400">Fotografe uma etiqueta e confirme o preço antes de preencher o campo.</p>
          </form></section>
        <section class="mt-8" aria-labelledby="shopping-list-title"><div class="mb-4 flex items-center justify-between px-1"><h2 id="shopping-list-title" class="text-lg font-bold tracking-tight">Sua lista</h2><span id="list-count" class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-emerald-200">0 itens</span></div><ul id="shopping-list-content" class="grid list-none gap-3 p-0" aria-live="polite"></ul></section>
      </main>
      <button id="update-button" class="fixed bottom-24 left-1/2 z-20 min-h-11 -translate-x-1/2 rounded-full bg-stone-900 px-5 text-sm font-bold text-white shadow-lg ring-1 ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 dark:bg-white dark:text-stone-900" type="button" hidden>Nova versão disponível — atualizar</button>
      <aside class="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-brand-900 text-white shadow-summary dark:bg-[#0c2922]" aria-label="Resumo da compra"><div class="mx-auto flex max-w-3xl items-center justify-between gap-6 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8"><div><p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/70">Quantidade</p><p id="summary-count" class="mt-1 text-base font-bold">0 itens</p></div><div class="h-10 w-px bg-white/15" aria-hidden="true"></div><div class="flex-1 text-right"><p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/70">Total da compra</p><p id="summary-total" class="mt-0.5 text-2xl font-extrabold tracking-tight">R$ 0,00</p></div></div></aside>
    </div>`
}
