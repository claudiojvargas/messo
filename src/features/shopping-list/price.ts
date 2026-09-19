export type PriceParseResult =
  | { ok: true; cents: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'non-positive' }

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function parsePrice(value: string): PriceParseResult {
  const input = value.trim()
  if (input.length === 0) return { ok: false, reason: 'empty' }
  if (!/^\d+(?:[.,]\d+)*$/.test(input)) {
    return { ok: false, reason: input.startsWith('-') ? 'non-positive' : 'invalid' }
  }

  const commaIndex = input.lastIndexOf(',')
  const dotIndex = input.lastIndexOf('.')
  const separatorIndex = Math.max(commaIndex, dotIndex)
  let integerPart = input
  let decimalPart = ''

  if (separatorIndex >= 0) {
    const separator = input[separatorIndex]
    const digitsAfterSeparator = input.length - separatorIndex - 1
    const hasBothSeparators = commaIndex >= 0 && dotIndex >= 0
    const occurrences = [...input].filter((character) => character === separator).length
    const isDecimalSeparator = hasBothSeparators || (occurrences === 1 && digitsAfterSeparator <= 2)

    if (isDecimalSeparator) {
      integerPart = input.slice(0, separatorIndex)
      decimalPart = input.slice(separatorIndex + 1)
      if (decimalPart.length < 1 || decimalPart.length > 2) return { ok: false, reason: 'invalid' }
    }
  }

  const groupingSeparator = integerPart.includes('.') ? '.' : integerPart.includes(',') ? ',' : null
  if (groupingSeparator) {
    const groups = integerPart.split(groupingSeparator)
    if (!/^\d{1,3}$/.test(groups[0] ?? '') || groups.slice(1).some((group) => !/^\d{3}$/.test(group))) {
      return { ok: false, reason: 'invalid' }
    }
  }

  const wholeDigits = integerPart.replaceAll('.', '').replaceAll(',', '')
  if (!/^\d+$/.test(wholeDigits)) return { ok: false, reason: 'invalid' }

  const cents = Number(wholeDigits) * 100 + Number(decimalPart.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) return { ok: false, reason: 'invalid' }
  if (cents <= 0) return { ok: false, reason: 'non-positive' }
  return { ok: true, cents }
}

export function parsePriceToCents(value: string): number | null {
  const result = parsePrice(value)
  return result.ok ? result.cents : null
}

export function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export function formatCentsForInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
