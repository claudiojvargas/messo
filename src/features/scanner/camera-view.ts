import { cameraErrorMessage } from './camera-errors'
import { videoContentRect } from './camera-framing'
import {
  captureVideoFrame,
  cameraDeviceDisplayName,
  cameraVideoFit,
  listCameraDevices,
  prepareCameraStream,
  rememberCameraDevice,
  selectedCameraDeviceId,
  startCamera,
  stopCamera,
  type CameraDevice,
  type CapturedImage,
} from './camera'

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
  const frame = requireElement<HTMLElement>(dialog, '[data-camera-frame]')
  const stage = requireElement<HTMLElement>(dialog, '.camera-stage')
  const photo = requireElement<HTMLImageElement>(dialog, '[data-camera-photo]')
  const loading = requireElement<HTMLElement>(dialog, '[data-camera-loading]')
  const errorMessage = requireElement<HTMLElement>(dialog, '[data-camera-error]')
  const captureButton = requireElement<HTMLButtonElement>(dialog, '[data-camera-capture]')
  const cameraSelector = requireElement<HTMLElement>(dialog, '[data-camera-selector]')
  const cameraSelect = requireElement<HTMLSelectElement>(dialog, '[data-camera-select]')
  const closeButtons = dialog.querySelectorAll<HTMLButtonElement>('[data-camera-cancel]')
  const reviewActions = requireElement<HTMLElement>(dialog, '[data-camera-review]')
  const retakeButton = requireElement<HTMLButtonElement>(dialog, '[data-camera-retake]')
  const useButton = requireElement<HTMLButtonElement>(dialog, '[data-camera-use]')

  let stream: MediaStream | null = null
  let capture: CapturedImage | null = null
  let previewUrl: string | null = null
  let settled = false
  let cameras: CameraDevice[] = []

  const updateFrame = (): void => {
    if (settled || !stream || video.hidden || !video.videoWidth || !video.videoHeight) {
      frame.hidden = true
      return
    }
    const bounds = video.getBoundingClientRect()
    if (!bounds.width || !bounds.height) {
      frame.hidden = true
      return
    }
    const content = videoContentRect(video.videoWidth, video.videoHeight, bounds, cameraVideoFit(video))
    const visible = {
      left: Math.max(content.left, bounds.left),
      top: Math.max(content.top, bounds.top),
      width: Math.min(content.left + content.width, bounds.right) - Math.max(content.left, bounds.left),
      height: Math.min(content.top + content.height, bounds.bottom) - Math.max(content.top, bounds.top),
    }
    const container = stage.getBoundingClientRect()
    // A 3:2 frame fits whole labels rather than a single line of text.
    const width = Math.min(visible.width * 0.88, visible.height * 0.76 * 1.5)
    const height = width / 1.5
    frame.style.left = `${visible.left - container.left + (visible.width - width) / 2}px`
    frame.style.top = `${visible.top - container.top + (visible.height - height) / 2}px`
    frame.style.width = `${width}px`
    frame.style.height = `${height}px`
    frame.hidden = false
  }
  const frameObserver = new ResizeObserver(updateFrame)
  frameObserver.observe(stage)
  frameObserver.observe(video)
  video.addEventListener('resize', updateFrame)

  const releaseStream = (): void => {
    frame.hidden = true
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
    frameObserver.disconnect()
    video.removeEventListener('resize', updateFrame)
    releaseStream()
    releasePreview()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    dialog.close()
    dialog.remove()
    trigger.focus()
    resolve(result)
  }

  const connectStream = async (nextStream: MediaStream): Promise<void> => {
    stream = nextStream
    video.srcObject = stream
    await video.play()
    await prepareCameraStream(stream)
    rememberCameraDevice(stream)
    updateFrame()
  }

  const updateAvailableCameras = async (): Promise<void> => {
    cameras = await listCameraDevices().catch(() => [])
    cameraSelect.replaceChildren(...cameras.map((camera, index) => {
      const option = document.createElement('option')
      option.value = camera.deviceId
      option.textContent = cameraDeviceDisplayName(camera, index)
      return option
    }))
    const currentDeviceId = stream ? selectedCameraDeviceId(stream) : null
    if (currentDeviceId && cameras.some(({ deviceId }) => deviceId === currentDeviceId)) {
      cameraSelect.value = currentDeviceId
    }
    cameraSelector.hidden = cameras.length < 2
  }

  const showLivePreview = async (): Promise<void> => {
    loading.textContent = 'Iniciando câmera...'
    loading.hidden = false
    errorMessage.hidden = true
    video.hidden = false
    photo.hidden = true
    reviewActions.hidden = true
    captureButton.hidden = false
    captureButton.disabled = true
    cameraSelector.hidden = true

    try {
      const nextStream = await startCamera()
      if (settled) {
        stopCamera(nextStream)
        return
      }
      await connectStream(nextStream)
      if (settled) {
        releaseStream()
        return
      }
      await updateAvailableCameras()
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
      updateFrame()
      capture = await captureVideoFrame(video, frame)
      if (settled) return
      releaseStream()
      previewUrl = URL.createObjectURL(capture.blob)
      photo.src = previewUrl
      photo.hidden = false
      video.hidden = true
      loading.hidden = true
      captureButton.hidden = true
      cameraSelector.hidden = true
      reviewActions.hidden = false
      useButton.focus()
    } catch (error) {
      errorMessage.textContent = cameraErrorMessage(error)
      errorMessage.hidden = false
      captureButton.disabled = false
    }
  })

  cameraSelect.addEventListener('change', async () => {
    if (!stream || !cameraSelect.value || cameraSelect.value === selectedCameraDeviceId(stream)) return
    const deviceId = cameraSelect.value

    cameraSelect.disabled = true
    captureButton.disabled = true
    loading.textContent = 'Trocando câmera...'
    loading.hidden = false
    releaseStream()
    try {
      const nextStream = await startCamera(deviceId)
      if (settled) {
        stopCamera(nextStream)
        return
      }
      await connectStream(nextStream)
      await updateAvailableCameras()
      loading.hidden = true
      captureButton.disabled = false
    } catch (error) {
      releaseStream()
      try {
        const fallbackStream = await startCamera()
        if (settled) {
          stopCamera(fallbackStream)
          return
        }
        await connectStream(fallbackStream)
        await updateAvailableCameras()
        loading.hidden = true
        captureButton.disabled = false
      } catch {
        errorMessage.textContent = cameraErrorMessage(error)
        errorMessage.hidden = false
        loading.hidden = true
      }
    } finally {
      cameraSelect.disabled = false
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
        <div><p class="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Capturar etiqueta</p><h2 id="camera-title" class="mt-1 text-xl font-bold text-white">Posicione toda a etiqueta dentro da moldura</h2><p id="camera-framing-help" class="camera-framing-help">Inclua nome, todos os preços, unidades e condições promocionais dentro da moldura.</p></div>
        <button class="camera-icon-button" type="button" data-camera-cancel data-camera-close aria-label="Fechar câmera"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg></button>
      </header>
      <div class="camera-stage">
        <video class="camera-media" data-camera-video aria-describedby="camera-framing-help" autoplay muted playsinline></video>
        <div class="camera-frame" data-camera-frame aria-hidden="true" hidden></div>
        <img class="camera-media" data-camera-photo alt="Foto capturada da etiqueta" hidden>
        <p class="camera-loading" data-camera-loading role="status">Iniciando câmera...</p>
        <p class="camera-error" data-camera-error role="alert" hidden></p>
      </div>
      <footer class="camera-footer">
        <button class="camera-capture-button" type="button" data-camera-capture aria-label="Capturar foto" disabled><span aria-hidden="true"></span></button>
        <div class="grid w-full max-w-sm gap-1.5" data-camera-selector hidden><label class="text-xs font-bold uppercase tracking-wider text-stone-300" for="camera-device-select">Câmera</label><select id="camera-device-select" class="min-h-11 w-full rounded-xl border border-white/25 bg-stone-900 px-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-50" data-camera-select></select></div>
        <div class="grid w-full grid-cols-2 gap-3" data-camera-review hidden>
          <button class="camera-secondary-button" type="button" data-camera-retake>Tirar novamente</button>
          <button class="camera-primary-button" type="button" data-camera-use>Usar foto</button>
        </div>
        <button class="min-h-11 px-4 text-sm font-bold text-stone-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white" type="button" data-camera-cancel>Cancelar</button>
      </footer>
    </div>`
}
