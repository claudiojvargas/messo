export function confirmClearShoppingList(
  quantity: number,
  trigger: HTMLButtonElement,
): Promise<boolean> {
  const dialog = document.createElement('dialog')
  dialog.className = 'clear-list-dialog'
  dialog.setAttribute('aria-labelledby', 'clear-list-title')
  dialog.setAttribute('aria-describedby', 'clear-list-description')
  dialog.innerHTML = dialogTemplate(quantity)
  document.body.append(dialog)

  const cancelButton = requireElement<HTMLButtonElement>(dialog, '[data-clear-cancel]')
  const confirmButton = requireElement<HTMLButtonElement>(dialog, '[data-clear-confirm]')

  return new Promise<boolean>((resolve) => {
    let settled = false

    const finish = (confirmed: boolean): void => {
      if (settled) return
      settled = true
      dialog.close()
      dialog.remove()
      trigger.focus()
      resolve(confirmed)
    }

    cancelButton.addEventListener('click', () => finish(false))
    confirmButton.addEventListener('click', () => finish(true))
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      finish(false)
    })

    dialog.showModal()
    cancelButton.focus()
  })
}

function dialogTemplate(quantity: number): string {
  const quantityMessage = quantity === 1
    ? 'O item da compra será removido.'
    : `Todos os ${quantity} itens da compra serão removidos.`

  return `
    <div class="p-6">
      <span class="mb-4 grid size-11 place-items-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300" aria-hidden="true">
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v5M12 17h.01" stroke-linecap="round"/><path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" stroke-linejoin="round"/></svg>
      </span>
      <h2 id="clear-list-title" class="text-xl font-bold text-stone-900 dark:text-white">Limpar lista?</h2>
      <p id="clear-list-description" class="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">${quantityMessage} Esta ação não pode ser desfeita.</p>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <button class="min-h-12 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800" type="button" data-clear-cancel>Cancelar</button>
        <button class="min-h-12 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700" type="button" data-clear-confirm>Limpar lista</button>
      </div>
    </div>`
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector)
  if (!element) throw new Error(`Elemento do diálogo não encontrado: ${selector}`)
  return element
}
