export type CameraErrorKind =
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'unsupported'
  | 'constraints'
  | 'capture-failed'
  | 'unknown'

export class CameraError extends Error {
  constructor(
    public readonly kind: CameraErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'CameraError'
  }
}

export function cameraErrorMessage(error: unknown): string {
  const kind = error instanceof CameraError ? error.kind : kindFromBrowserError(error)

  switch (kind) {
    case 'permission-denied':
      return 'Permita o acesso à câmera para fotografar a etiqueta.'
    case 'not-found':
      return 'Nenhuma câmera compatível foi encontrada neste dispositivo.'
    case 'in-use':
      return 'A câmera parece estar em uso por outro aplicativo. Feche-o e tente novamente.'
    case 'unsupported':
      return 'A câmera não está disponível neste navegador ou contexto. Use HTTPS ou localhost.'
    case 'constraints':
      return 'A câmera disponível não oferece uma configuração compatível.'
    case 'capture-failed':
      return 'Não foi possível capturar a foto. Tente novamente.'
    default:
      return 'Não foi possível acessar a câmera.'
  }
}

function kindFromBrowserError(error: unknown): CameraErrorKind {
  if (!(error instanceof DOMException) && !(error instanceof Error)) return 'unknown'

  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission-denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'not-found'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'constraints'
    case 'TypeError':
      return 'unsupported'
    default:
      return 'unknown'
  }
}
