type ProductIcon = {
  label: string
  paths: string
}

const icons = {
  apple: { label: 'Fruta', paths: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.78 4.78 0 0 0 17.2 5c-2.2 0-3.73 1.44-5.2 1.44C10.43 6.44 8.8 5 6.6 5A4.6 4.6 0 0 0 2 9.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/> ' },
  beef: { label: 'Carne', paths: '<path d="M16.4 13.7A6 6 0 1 0 8.3 5.6C5 8.9 2 13.6 3.7 15.3c.7.7 1.8.7 3.1.2-.5 1.3-.5 2.4.2 3.1 1.7 1.7 6.4-1.3 9.7-4.6Z"/><circle cx="12.5" cy="9.5" r="2.5"/><path d="m18 16 1.5 1.5M15.5 18.5 17 20"/> ' },
  bread: { label: 'Pão', paths: '<path d="M7 10.5V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.5"/><path d="M5 8.5a3.5 3.5 0 0 1 5.5-2.87A3.5 3.5 0 0 1 17 7.5a3 3 0 0 1 0 6H7a3 3 0 0 1-2-5Z"/> ' },
  carrot: { label: 'Legume', paths: '<path d="M2.27 21.7s9.1-3.73 12.73-7.36a4.24 4.24 0 0 0-6-6C5.37 11.97 2.27 21.7 2.27 21.7Z"/><path d="M14.42 6.6c.1-1.6-.5-3.2-1.42-4.6M18.24 9.38c1.63-.11 3.17.5 4.61 1.4M16.25 7.75 19 5"/><path d="m6.5 15.5 1 1M9 12l1 1"/> ' },
  coffee: { label: 'Café', paths: '<path d="M10 2v2M14 2v2M6 2v2"/><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M4 6h14v8a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6Z"/> ' },
  fish: { label: 'Peixe', paths: '<path d="M6.5 12c2.5-4 6.5-4 10-1l4-3v8l-4-3c-3.5 3-7.5 3-10-1Z"/><path d="M6.5 12 3 9v6Z"/><circle cx="14" cy="11" r=".5" fill="currentColor"/> ' },
  milk: { label: 'Leite', paths: '<path d="m8 2 1.5 3L8 8v14h8V8l-1.5-3L16 2Z"/><path d="M8 2h8M8 8h8M8 13h8"/> ' },
  package: { label: 'Produto', paths: '<path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/> ' },
  wheat: { label: 'Grãos', paths: '<path d="M2 22 16 8M3.5 15H9v5.5M7 11h5v5M10.5 7H15v4.5M14 3h4v4M6 3c4 0 7 3 7 7-4 0-7-3-7-7Z"/> ' },
} satisfies Record<string, ProductIcon>

function iconForName(productName: string): ProductIcon {
  const name = productName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/\b(leite)\b/.test(name)) return icons.milk
  if (/\b(cafe)\b/.test(name)) return icons.coffee
  if (/\b(maca|banana|fruta|laranja|pera)\b/.test(name)) return icons.apple
  if (/\b(cenoura|legume)\b/.test(name)) return icons.carrot
  if (/\b(carne|bovina|bife)\b/.test(name)) return icons.beef
  if (/\b(peixe|pescado)\b/.test(name)) return icons.fish
  if (/\b(arroz|feijao|farinha|grao)\b/.test(name)) return icons.wheat
  if (/\b(pao|cacetinho)\b/.test(name)) return icons.bread
  return icons.package
}

export function productIconTemplate(productName: string): string {
  const icon = iconForName(productName)
  return `<span class="product-icon" role="img" aria-label="${icon.label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon.paths}</svg></span>`
}
