/**
 * Confidence is an evidence score, not a statistical probability. Every score
 * starts from OCR quality (or a neutral 0.6 when unavailable), then receives
 * the documented bonuses/penalties below. Keeping them here makes calibration
 * against a future real-label benchmark straightforward.
 */
export const confidenceWeights = {
  neutralOcr: 0.6,
  explicitContext: 0.22,
  unitContext: 0.18,
  nearbyContext: 0.12,
  layoutSignal: 0.08,
  mathematicalMatch: 0.18,
  mathematicalMismatch: -0.35,
  ambiguousType: -0.18,
} as const

export function ocrConfidence(value?: number): number {
  return value === undefined ? confidenceWeights.neutralOcr : clamp(value / 100)
}

export function combineConfidence(base: number, ...signals: number[]): number {
  return roundConfidence(clamp(base + signals.reduce((sum, signal) => sum + signal, 0)))
}

export function averageConfidence(values: readonly number[]): number {
  if (values.length === 0) return 0
  return roundConfidence(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100
}
