import { cameraErrorMessage } from './camera-errors'
import { captureVideoFrame, startCamera, stopCamera, type CapturedImage } from './camera'

let activeCamera: Promise<CapturedImage | null> | null = null

export function openCamera(trigger: HTMLElement): Promise<CapturedImage | null> {
  if (activeCamera) return activeCamera

  activeCamera = runCameraFlow(trigger).finally(() => {
    activeCamera = null
  })
  return activeCamera
}

async function runCameraFlow(trigger: HTMLElement): Promise<CapturedImage | null> {
  const dialog = document.createElement('dialog')
  dialog.className = 'camera-dialog'
  dialog.setAttribute('aria-labelledby', 'camera-title')
  dialog.innerHTML = cameraTemplate()
  document.body.append(dialog)

  const video = requireElement<HTMLVideoElement>(dialog, '[data-camera-video]')
  const photo = requireElement<HTMLImageElement>(dialog, '[data-camera-photo]')
  const loading = requireElement<HTMLElement>(dialog, '[data-camera-loading]')
  const errorMessage = requireElement<HTMLElement>(dialog, '[data-camera-error]')
  const captureButton = requireElement<HTMLButtonElement>(dialog, '[data-camera-capture]')
  const closeButtons = dialog.querySelectorAll<HTMLButtonElement>('[data-camera-cancel]')
  const reviewActions = requireElement<HTMLElement>(dialog, '[data-camera-review]')
  const retakeButton = requireElement<HTMLButtonElement>(dialog, '[data-camera-retake]')
  const useButton = requireElement<HTMLButtonElement>(dialog, '[data-camera-use]')

  let stream: MediaStream | null = null
  let capture: CapturedImage | null = null
  let previewUrl: string | null = null
  let settled = false

  const releaseStream = (): void => {
    stopCamera(stream)
    stream = null
    video.srcObject = null
  }

  const releasePreview = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = null
    photo.removeAttribute('src')
  }

  const finish = (result: CapturedImage | null, resolve: (value: CapturedImage | null) => void): void => {
    if (settled) return
    settled = true
    releaseStream()
    releasePreview()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    dialog.close()
    dialog.remove()
    trigger.focus()
    resolve(result)
  }

  const showLivePreview = async (): Promise<void> => {
    loading.hidden = false
    errorMessage.hidden = true
    video.hidden = false
    photo.hidden = true
    reviewActions.hidden = true
    captureButton.hidden = false
    captureButton.disabled = true

    try {
      stream = await startCamera()
      if (settled) {
        releaseStream()
        return
      }
      video.srcObject = stream
      await video.play()
      if (settled) {
        releaseStream()
        return
      }
      loading.hidden = true
      captureButton.disabled = false
      captureButton.focus()
    } catch (error) {
      releaseStream()
      loading.hidden = true
      video.hidden = true
      captureButton.hidden = true
      errorMessage.textContent = cameraErrorMessage(error)
      errorMessage.hidden = false
    }
  }

  let resolveFlow: (value: CapturedImage | null) => void = () => undefined
  const result = new Promise<CapturedImage | null>((resolve) => {
    resolveFlow = resolve
  })

  const cancel = (): void => finish(null, resolveFlow)
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') cancel()
  }
  const handlePageHide = (): void => cancel()

  closeButtons.forEach((button) => button.addEventListener('click', cancel))
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    cancel()
  })
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)

  captureButton.addEventListener('click', async () => {
    captureButton.disabled = true
    try {
      capture = await captureVideoFrame(video)
      if (settled) return
      releaseStream()
      previewUrl = URL.createObjectURL(capture.blob)
      photo.src = previewUrl
      photo.hidden = false
      video.hidden = true
      loading.hidden = true
      captureButton.hidden = true
      reviewActions.hidden = false
      useButton.focus()
    } catch (error) {
      errorMessage.textContent = cameraErrorMessage(error)
      errorMessage.hidden = false
      captureButton.disabled = false
    }
  })

  retakeButton.addEventListener('click', () => {
    capture = null
    releasePreview()
    void showLivePreview()
  })

  useButton.addEventListener('click', () => {
    if (capture) finish(capture, resolveFlow)
  })

  dialog.showModal()
  requireElement<HTMLButtonElement>(dialog, '[data-camera-close]').focus()
  void showLivePreview()
  return result
}

function requireElement<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector)
  if (!element) throw new Error(`Elemento da câmera não encontrado: ${selector}`)
  return element
}

function cameraTemplate(): string {
  return `
    <div class="camera-shell">
      <header class="camera-header">
        <div><p class="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Capturar etiqueta</p><h2 id="camera-title" class="mt-1 text-xl font-bold text-white">Aponte para a etiqueta de preço</h2></div>
        <button class="camera-icon-button" type="button" data-camera-cancel data-camera-close aria-label="Fechar câmera"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg></button>
      </header>
      <div class="camera-stage">
        <video class="camera-media" data-camera-video autoplay muted playsinline></video>
        <img class="camera-media" data-camera-photo alt="Foto capturada da etiqueta" hidden>
        <p class="camera-loading" data-camera-loading role="status">Iniciando câmera...</p>
        <p class="camera-error" data-camera-error role="alert" hidden></p>
      </div>
      <footer class="camera-footer">
        <button class="camera-capture-button" type="button" data-camera-capture aria-label="Capturar foto" disabled><span aria-hidden="true"></span></button>
        <div class="grid w-full grid-cols-2 gap-3" data-camera-review hidden>
          <button class="camera-secondary-button" type="button" data-camera-retake>Tirar novamente</button>
          <button class="camera-primary-button" type="button" data-camera-use>Usar foto</button>
        </div>
        <button class="min-h-11 px-4 text-sm font-bold text-stone-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white" type="button" data-camera-cancel>Cancelar</button>
      </footer>
    </div>`
}
