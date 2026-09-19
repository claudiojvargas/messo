import { PRODUCT_CATALOG } from './product-catalog'
import { findProductSuggestions } from './product-suggestions'

interface ProductSuggestionsViewOptions {
  input: HTMLInputElement
  list: HTMLElement
  getCurrentProductNames: () => readonly string[]
}

export interface ProductSuggestionsController {
  close: () => void
}

export function mountProductSuggestions({
  input,
  list,
  getCurrentProductNames,
}: ProductSuggestionsViewOptions): ProductSuggestionsController {
  let suggestions: string[] = []
  let activeIndex = -1

  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', list.id)
  input.setAttribute('aria-expanded', 'false')

  const close = (): void => {
    suggestions = []
    activeIndex = -1
    list.hidden = true
    list.replaceChildren()
    input.setAttribute('aria-expanded', 'false')
    input.removeAttribute('aria-activedescendant')
  }

  const render = (): void => {
    suggestions = findProductSuggestions(input.value, {
      catalog: PRODUCT_CATALOG,
      currentProducts: getCurrentProductNames(),
    })
    activeIndex = -1
    if (suggestions.length === 0) {
      close()
      return
    }

    list.innerHTML = suggestions.map((name, index) => suggestionTemplate(name, index)).join('')
    list.hidden = false
    input.setAttribute('aria-expanded', 'true')
    input.removeAttribute('aria-activedescendant')
  }

  const setActiveIndex = (index: number): void => {
    activeIndex = index
    const options = list.querySelectorAll<HTMLElement>('[role="option"]')
    options.forEach((option, optionIndex) => option.setAttribute('aria-selected', String(optionIndex === activeIndex)))
    const activeOption = options.item(activeIndex)
    if (activeOption) {
      input.setAttribute('aria-activedescendant', activeOption.id)
      activeOption.scrollIntoView({ block: 'nearest' })
    }
  }

  const select = (index: number): void => {
    const suggestion = suggestions[index]
    if (!suggestion) return
    input.value = suggestion
    close()
    input.focus()
  }

  input.addEventListener('input', render)
  input.addEventListener('keydown', (event) => {
    if (suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(activeIndex >= suggestions.length - 1 ? 0 : activeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1)
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      select(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  })
  input.addEventListener('blur', () => window.setTimeout(close, 0))
  list.addEventListener('pointerdown', (event) => {
    const option = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-suggestion-index]') : null
    if (!option) return
    event.preventDefault()
    select(Number(option.dataset.suggestionIndex))
  })

  return { close }
}

function suggestionTemplate(name: string, index: number): string {
  return `<li id="product-suggestion-${index}" class="product-suggestion" role="option" aria-selected="false" data-suggestion-index="${index}">${escapeHtml(name)}</li>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character)
}
