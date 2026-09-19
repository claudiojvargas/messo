interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function initializeInstallPrompt(button: HTMLButtonElement): void {
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    button.hidden = false
  })

  button.addEventListener('click', async () => {
    if (!deferredPrompt) return
    button.hidden = true
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    button.hidden = true
  })
}
