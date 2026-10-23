import { cachePaddleResources, PADDLE_CACHE } from './resources'
import { prepareExperimentalImage } from './prepare-image'
import { registerSW } from 'virtual:pwa-register'
import { openCamera } from '../../camera-view'
import { parseLabel } from '../label-parser'
import { resolveProduct } from '../product-resolver'
import { initializePaddle, recognizePaddle, disposePaddle } from './paddle-ocr'

export function mountOcrExperiment(app: HTMLElement) {
  document.title = 'Messo — Laboratório OCR'
  app.innerHTML = `<main style="max-width:52rem;margin:auto;padding:1rem;display:grid;gap:1rem">
    <h1>Laboratório OCR — Issue #28</h1>
    <p>Experimental. Sem envio de imagens. O carrinho continua usando Tesseract. Confira nome, preços, unidades e condições na foto; nenhum resultado é confirmado automaticamente.</p>
    <label>Foto da etiqueta <input id="ocr-file" type="file" accept="image/*"></label>
    <button id="ocr-camera">Capturar com a câmera</button>
    <img id="ocr-preview" alt="Etiqueta selecionada" hidden style="max-width:100%;max-height:40vh;object-fit:contain">
    <label>Motor <select id="ocr-engine"><option value="paddle">PaddleOCR (experimental)</option><option value="tesseract">Tesseract (atual)</option></select></label>
    <button id="ocr-prepare">Preparar PaddleOCR e cache offline</button>
    <button id="ocr-run">Reconhecer imagem</button>
    <button id="ocr-release">Liberar motor PaddleOCR</button>
    <button id="ocr-clear">Limpar cache experimental</button>
    <button id="ocr-update" hidden>Aplicar atualização da PWA</button>
    <p id="ocr-status" role="status">Selecione uma foto ou capture uma etiqueta.</p>
    <pre id="ocr-output" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
    <a href="/app">Voltar ao carrinho</a>
  </main>`
  const find = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!
  const status = find('#ocr-status')
  const output = find('#ocr-output')
  const buttons = Array.from(app.querySelectorAll<HTMLButtonElement>('button'))
  let image: Blob | undefined
  let previewUrl: string | undefined
  function selectImage(blob: Blob) {
    image = blob
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(blob)
    const preview = find<HTMLImageElement>('#ocr-preview')
    preview.src = previewUrl
    preview.hidden = false
    output.textContent = ''
    status.textContent = 'Foto selecionada. Escolha um motor para executar.'
  }
  window.addEventListener('pagehide', () => { if (previewUrl) URL.revokeObjectURL(previewUrl) })
  const update = registerSW({ immediate: true, onNeedRefresh() { find('#ocr-update').hidden = false } })
  find('#ocr-update').onclick = () => { void update(true) }
  find<HTMLInputElement>('#ocr-file').onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) selectImage(file)
  }
  async function task(action: () => Promise<void>) {
    buttons.forEach((button) => { button.disabled = true })
    find<HTMLInputElement>('#ocr-file').disabled = true
    output.textContent = ''
    try { await action() } catch (error) {
      status.textContent = `Falha técnica: ${error instanceof Error ? error.message : String(error)}. Confira os recursos locais e tente novamente; a entrada manual continua disponível no carrinho.`
    } finally {
      buttons.forEach((button) => { button.disabled = false })
      find<HTMLInputElement>('#ocr-file').disabled = false
    }
  }
  find<HTMLButtonElement>('#ocr-camera').onclick = (event) => { void task(async () => {
    const captured = await openCamera(event.currentTarget as HTMLButtonElement)
    if (captured) selectImage(captured.blob)
  }) }
  find('#ocr-prepare').onclick = () => { void task(async () => {
    status.textContent = 'Carregando modelos e inicializando o worker…'
    if (!('serviceWorker' in navigator) || !('caches' in window)) throw new Error('Cache offline requer navegador compatível e contexto seguro HTTPS.')
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) throw new Error('Recarregue esta página após instalar o Service Worker e prepare os recursos novamente.')
    await cachePaddleResources()
    const engine = await initializePaddle()
    status.textContent = 'Recursos armazenados e motor inicializado. Execute uma leitura e faça o teste de fechar/reabrir sem rede; cache não garante persistência.'
    output.textContent = JSON.stringify({ initialization: engine.getInitializationSummary(), cachedResources: (await (await caches.open(PADDLE_CACHE)).keys()).map((request) => request.url), storage: await navigator.storage?.estimate() }, null, 2)
  }) }
  find('#ocr-run').onclick = () => { void task(async () => {
    if (!image) throw new Error('Selecione ou capture uma foto primeiro.')
    status.textContent = 'Reconhecendo localmente…'
    const engine = find<HTMLSelectElement>('#ocr-engine').value
    const preparationStart = performance.now()
    const prepared = await prepareExperimentalImage(image)
    const preparationMs = performance.now() - preparationStart
    const start = performance.now()
    const result = engine === 'paddle' ? await recognizePaddle(prepared.blob) : await (await import('../tesseract-ocr')).recognizeImage(prepared.blob)
    const elapsedMs = performance.now() - start
    const parsed = parseLabel(result)
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory
    output.textContent = JSON.stringify({ engine, preparationMs, input: { width: prepared.width, height: prepared.height, bytes: prepared.blob.size, mime: prepared.blob.type }, elapsedMs, result, parsed, product: parsed.product ? resolveProduct(parsed.product.name) : null, memory: memory ? { usedJSHeapSize: memory.usedJSHeapSize, totalJSHeapSize: memory.totalJSHeapSize, limitation: 'Heap JS aproximado; não representa toda a memória WASM, GPU ou worker.' } : null }, null, 2)
    status.textContent = result.text.trim() ? 'Leitura concluída. Confira os dados na etiqueta; o parser pode interpretar incorretamente referências e promoções.' : 'Leitura concluída sem texto. Refaça a foto ou use entrada manual.'
  }) }
  find('#ocr-clear').onclick = () => { void task(async () => { await disposePaddle(); await caches.delete(PADDLE_CACHE); status.textContent = 'Cache experimental removido. Prepare o motor novamente com internet antes de usar offline.' }) }
  find('#ocr-release').onclick = () => { void task(async () => { await disposePaddle(); status.textContent = 'Motor PaddleOCR liberado.' }) }
}
