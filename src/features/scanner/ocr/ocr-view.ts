import type { CapturedImage } from '../camera'
import { extractPriceCandidates, type PriceCandidate } from './price-candidates'
import { formatCurrency } from '../../shopping-list/price'
import type { OcrProgress, OcrResult } from './ocr-types'

export type OcrDecision =
  | { action: 'price'; valueCents: number }
  | { action: 'retake' }
  | { action: 'manual' }

export async function openOcrResult(
  capturedImage: CapturedImage,
  trigger: HTMLElement,
): Promise<OcrDecision> {
  const dialog = document.createElement('dialog')
  dialog.className = 'ocr-dialog'
  dialog.setAttribute('aria-labelledby', 'ocr-title')
  dialog.innerHTML = ocrTemplate()
  document.body.append(dialog)

  const processing = requireElement<HTMLElement>(dialog, '[data-ocr-processing]')
  const progressLabel = requireElement<HTMLElement>(dialog, '[data-ocr-progress]')
  const candidatesPanel = requireElement<HTMLElement>(dialog, '[data-ocr-candidates]')
  const candidateList = requireElement<HTMLElement>(dialog, '[data-ocr-list]')
  const emptyPanel = requireElement<HTMLElement>(dialog, '[data-ocr-empty]')
  const errorPanel = requireElement<HTMLElement>(dialog, '[data-ocr-error]')
  const usePriceButton = requireElement<HTMLButtonElement>(dialog, '[data-ocr-use]')
  const retryButton = requireElement<HTMLButtonElement>(dialog, '[data-ocr-retry]')
  const retakeButton = requireElement<HTMLButtonElement>(dialog, '[data-ocr-retake]')
  const manualButtons = dialog.querySelectorAll<HTMLButtonElement>('[data-ocr-manual]')

  let sourceImage: CapturedImage | null = capturedImage
  let rawText = ''
  let candidates: PriceCandidate[] = []
  let attempt = 0
  let settled = false

  let resolveFlow: (decision: OcrDecision) => void = () => undefined
  const result = new Promise<OcrDecision>((resolve) => {
    resolveFlow = resolve
  })

  const finish = (decision: OcrDecision): void => {
    if (settled) return
    settled = true
    attempt += 1
    sourceImage = null
    rawText = ''
    candidates = []
    dialog.close()
    dialog.remove()
    trigger.focus()
    resolveFlow(decision)
  }

  const updateProgress = (progress: OcrProgress): void => {
    if (settled) return
    if (progress.stage === 'preparing') {
      progressLabel.textContent = 'Preparando leitura...'
      return
    }
    const percentage = progress.progress === undefined ? '' : ` ${Math.round(progress.progress * 100)}%`
    progressLabel.textContent = `Lendo preço...${percentage}`
  }

  const showCandidates = (ocrResult: OcrResult): void => {
    rawText = ocrResult.text
    candidates = extractPriceCandidates(rawText)
    processing.hidden = true

    if (candidates.length === 0) {
      emptyPanel.hidden = false
      retakeButton.focus()
      return
    }

    candidateList.innerHTML = candidates.map(candidateTemplate).join('')
    candidatesPanel.hidden = false
    usePriceButton.disabled = false
    requireElement<HTMLInputElement>(candidateList, 'input[name="ocr-price"]').focus()
  }

  const recognize = async (): Promise<void> => {
    const image = sourceImage
    if (!image || settled) return
    const currentAttempt = ++attempt
    processing.hidden = false
    candidatesPanel.hidden = true
    emptyPanel.hidden = true
    errorPanel.hidden = true
    usePriceButton.disabled = true
    updateProgress({ stage: 'preparing' })

    try {
      const { recognizeImage } = await import('./tesseract-ocr')
      const ocrResult = await recognizeImage(image.blob, (progress) => {
        if (currentAttempt === attempt) updateProgress(progress)
      })
      if (!settled && currentAttempt === attempt) showCandidates(ocrResult)
    } catch {
      if (settled || currentAttempt !== attempt) return
      processing.hidden = true
      errorPanel.hidden = false
      retryButton.focus()
    }
  }

  usePriceButton.addEventListener('click', () => {
    const selected = dialog.querySelector<HTMLInputElement>('input[name="ocr-price"]:checked')
    const valueCents = Number(selected?.value)
    if (Number.isSafeInteger(valueCents) && valueCents > 0) finish({ action: 'price', valueCents })
  })
  retryButton.addEventListener('click', () => void recognize())
  retakeButton.addEventListener('click', () => finish({ action: 'retake' }))
  manualButtons.forEach((button) => button.addEventListener('click', () => finish({ action: 'manual' })))
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    finish({ action: 'manual' })
  })

  dialog.showModal()
  void recognize()
  return result
}

function candidateTemplate(candidate: PriceCandidate, index: number): string {
  return `
    <label class="ocr-candidate">
      <input class="size-5 accent-brand-700" type="radio" name="ocr-price" value="${candidate.valueCents}" ${index === 0 ? 'checked' : ''}>
      <span class="min-w-0"><span class="block text-lg font-extrabold text-stone-900 dark:text-white">${formatCurrency(candidate.valueCents)}</span><span class="block truncate text-xs text-stone-500 dark:text-stone-400">${escapeHtml(candidate.line)}</span></span>
    </label>`
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector)
  if (!element) throw new Error(`Elemento de leitura não encontrado: ${selector}`)
  return element
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character)
}

function ocrTemplate(): string {
  return `
    <div class="flex max-h-[min(42rem,calc(100dvh_-_2rem))] min-h-96 flex-col">
      <header class="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-5 dark:border-stone-700"><div><p class="text-xs font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-emerald-300">Leitura local</p><h2 id="ocr-title" class="mt-1 text-xl font-bold">Escolha o preço</h2></div><button class="grid size-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-stone-300 dark:hover:bg-stone-800" type="button" data-ocr-manual aria-label="Fechar e digitar preço manualmente"><svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg></button></header>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <section class="grid min-h-48 place-items-center text-center" data-ocr-processing aria-live="polite"><div><span class="ocr-spinner" aria-hidden="true"></span><p class="mt-5 font-bold" data-ocr-progress>Preparando leitura...</p><p class="mt-2 text-sm text-stone-500 dark:text-stone-400">A primeira leitura pode levar um pouco mais.</p></div></section>
        <section data-ocr-candidates hidden><p class="mb-4 text-sm text-stone-600 dark:text-stone-300">Encontramos possíveis preços. Confirme a opção correta:</p><fieldset class="grid gap-3" data-ocr-list><legend class="sr-only">Preços encontrados</legend></fieldset><button class="camera-primary-button mt-5 w-full" type="button" data-ocr-use disabled>Usar preço selecionado</button></section>
        <section class="rounded-2xl bg-stone-100 p-5 text-center dark:bg-stone-800" data-ocr-empty hidden><h3 class="font-bold">Nenhum preço encontrado</h3><p class="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">Não encontramos um preço com segurança nesta foto.</p></section>
        <section class="rounded-2xl bg-red-50 p-5 text-center text-red-900 dark:bg-red-950/40 dark:text-red-100" data-ocr-error role="alert" hidden><h3 class="font-bold">Não foi possível ler esta imagem</h3><p class="mt-2 text-sm leading-6">Tente a leitura novamente ou tire outra foto.</p><button class="mt-4 min-h-11 rounded-xl border border-red-300 px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-red-700 dark:border-red-700" type="button" data-ocr-retry>Tentar leitura novamente</button></section>
      </div>
      <footer class="grid gap-2 border-t border-stone-200 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 dark:border-stone-700"><button class="ocr-secondary-button" type="button" data-ocr-retake>Tirar outra foto</button><button class="min-h-11 rounded-xl px-4 text-sm font-bold text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700 dark:text-emerald-300" type="button" data-ocr-manual>Digitar manualmente</button></footer>
    </div>`
}
