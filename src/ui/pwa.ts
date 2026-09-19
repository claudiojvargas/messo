import { registerSW } from 'virtual:pwa-register'
import { showToast } from './toast'

export function initializePwa(updateButton: HTMLButtonElement): void {
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      updateButton.hidden = false
    },
    onOfflineReady: () => {
      showToast('Messo pronto para funcionar offline.')
    },
    onRegisterError: () => {
      // Uma falha no service worker não deve impedir o uso normal da calculadora.
    },
  })

  updateButton.addEventListener('click', () => {
    updateButton.disabled = true
    void updateServiceWorker(true)
  })
}
