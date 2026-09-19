let hideTimer: ReturnType<typeof setTimeout> | undefined

export function showToast(message: string): void {
  let toast = document.querySelector<HTMLOutputElement>('#action-toast')
  if (!toast) {
    toast = document.createElement('output')
    toast.id = 'action-toast'
    toast.className = 'toast'
    toast.setAttribute('aria-live', 'polite')
    toast.setAttribute('aria-atomic', 'true')
    document.body.append(toast)
  }

  if (hideTimer) clearTimeout(hideTimer)
  toast.textContent = message
  toast.dataset.visible = 'true'
  hideTimer = setTimeout(() => {
    toast?.removeAttribute('data-visible')
  }, 2400)
}
