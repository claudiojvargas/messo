import { parsePriceToCents } from '../../shopping-list/price'

export interface PriceCandidate {
  raw: string
  valueCents: number
  line: string
}

const pricePattern = /(^|[^\d/+\-])((?:R\s*\$\s*)?(?:\d{1,3}(?:\s*\.\s*\d{3})+|\d+)\s*[,.]\s*\d{2})(?![\d%])/gi

export function extractPriceCandidates(text: string): PriceCandidate[] {
  const candidates = new Map<number, PriceCandidate>()

  for (const sourceLine of text.split(/\r?\n/)) {
    const line = sourceLine.trim()
    if (!line) continue

    for (const match of line.matchAll(pricePattern)) {
      const raw = match[2]?.trim()
      if (!raw || isMeasurementValue(line, raw)) continue

      const normalized = raw
        .replace(/^R\s*\$\s*/i, '')
        .replaceAll(/\s/g, '')
      const valueCents = parsePriceToCents(normalized)
      if (valueCents === null || candidates.has(valueCents)) continue

      candidates.set(valueCents, { raw, valueCents, line })
    }
  }

  return [...candidates.values()]
}

function isMeasurementValue(line: string, raw: string): boolean {
  if (/R\s*\$\s*\/\s*(?:KG|G|L|ML)\b/i.test(line)) return false
  if (/\bPES[O0]\b/i.test(line)) return true

  const start = line.indexOf(raw)
  if (start < 0) return false
  const remainder = line.slice(start + raw.length)
  return /^\s*\d*\s*(?:KG|G|L|ML)\b/i.test(remainder)
}
