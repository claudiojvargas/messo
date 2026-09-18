import { describe, expect, it } from 'vitest'
import { CameraError, cameraErrorMessage } from './camera-errors'

describe('cameraErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'Permita o acesso à câmera'],
    ['NotFoundError', 'Nenhuma câmera compatível'],
    ['NotReadableError', 'em uso por outro aplicativo'],
    ['OverconstrainedError', 'configuração compatível'],
    ['TypeError', 'HTTPS ou localhost'],
  ])('translates %s without exposing technical details', (name: string, expected: string) => {
    expect(cameraErrorMessage(new DOMException('', name))).toContain(expected)
  })

  it('translates capture failures raised by the camera layer', () => {
    expect(cameraErrorMessage(new CameraError('capture-failed', 'technical detail')))
      .toBe('Não foi possível capturar a foto. Tente novamente.')
  })

  it('uses a safe generic message for unexpected values', () => {
    expect(cameraErrorMessage({ reason: 'unexpected' })).toBe('Não foi possível acessar a câmera.')
  })
})
