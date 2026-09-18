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
      if (!raw) continue

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
