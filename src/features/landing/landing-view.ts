const icons = {
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1-1.5h6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.25"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m20 13-7 7-9-9V4h7l9 9Z" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>',
  basket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 10h16l-1.5 9h-13L4 10Z" stroke-linejoin="round"/><path d="m8 10 4-6 4 6M9 13v3m6-3v3" stroke-linecap="round"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

export function mountLandingPage(container: HTMLElement): void {
  container.innerHTML = landingTemplate()
}

function landingTemplate(): string {
  const steps = [
    ['camera', 'Aponte a câmera', 'Aponte o celular para a etiqueta do produto no supermercado.'],
    ['tag', 'Confira produto e preço', 'Veja as informações encontradas e confira tudo antes de continuar.'],
    ['basket', 'Adicione à sua compra', 'Confirme o produto e coloque o item no seu carrinho do Messo.'],
    ['chart', 'Acompanhe seu total', 'Continue comprando e saiba quanto já colocou no carrinho.'],
  ] as const

  const benefits = [
    ['chart', 'Controle dos gastos', 'Veja quanto sua compra está custando enquanto adiciona produtos.'],
    ['check', 'Menos contas de cabeça', 'Deixe as somas com o Messo e concentre-se na sua compra.'],
    ['tag', 'Conferência de preços', 'Visualize os preços da etiqueta antes de adicionar o produto.'],
    ['basket', 'Compra mais organizada', 'Tenha todos os produtos adicionados em um único lugar.'],
  ] as const

  return `
    <div class="min-h-screen bg-white font-sans text-stone-900">
      <header class="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-lg">
        <div class="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a class="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700" href="/" aria-label="Messo, página inicial">
            <img class="h-18" src="/images/logo-color.png" alt="">
          </a>
          <nav class="flex items-center gap-2 sm:gap-7" aria-label="Navegação principal">
            <a class="hidden text-sm font-semibold text-stone-600 transition hover:text-brand-800 sm:block" href="#como-funciona">Como funciona</a>
            <a class="hidden text-sm font-semibold text-stone-600 transition hover:text-brand-800 md:block" href="#beneficios">Benefícios</a>
            <a class="rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href="/app">Abrir Messo</a>
          </nav>
        </div>
      </header>

      <main>
        <section class="relative overflow-hidden bg-stone-50">
          <div class="absolute -right-32 -top-32 size-96 rounded-full bg-brand-50" aria-hidden="true"></div>
          <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
            <div class="max-w-2xl">
              <p class="mb-5 inline-flex rounded-full bg-brand-50 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-800">Sua compra sob controle</p>
              <h1 class="text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-stone-950 sm:text-5xl lg:text-6xl">Saiba quanto sua compra vai custar <span class="text-brand-700">antes de chegar ao caixa.</span></h1>
              <p class="mt-6 max-w-xl text-lg leading-8 text-stone-600">O Messo ajuda você a identificar produtos e preços durante suas compras, montar seu carrinho e acompanhar o total em tempo real.</p>
              <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                <a class="inline-flex min-h-13 items-center justify-center rounded-xl bg-brand-800 px-6 font-bold text-white shadow-lg shadow-brand-900/15 transition hover:-translate-y-0.5 hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href="/app">Começar minha compra <span class="ml-2" aria-hidden="true">→</span></a>
                <a class="inline-flex min-h-13 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 font-bold text-stone-700 transition hover:border-brand-700 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href="#como-funciona">Como funciona</a>
              </div>
            </div>
            ${heroDemo()}
          </div>
        </section>

        <section id="como-funciona" class="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
          <div class="mx-auto max-w-6xl">
            ${sectionHeading('Simples do início ao fim', 'Como funciona', 'Quatro passos para acompanhar a compra enquanto você percorre o supermercado.')}
            <ol class="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              ${steps.map(([icon, title, description], index) => `<li class="relative rounded-3xl border border-stone-200 bg-white p-6 shadow-card"><span class="mb-6 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 [&>svg]:size-6">${icons[icon]}</span><span class="absolute right-6 top-6 text-sm font-extrabold text-stone-300">0${index + 1}</span><h3 class="font-extrabold text-stone-900">${title}</h3><p class="mt-2 text-sm leading-6 text-stone-500">${description}</p></li>`).join('')}
            </ol>
          </div>
        </section>

        <section class="bg-brand-900 px-5 py-16 text-white sm:px-8 sm:py-20">
          <div class="mx-auto grid max-w-6xl gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
            <span class="grid size-16 place-items-center rounded-3xl bg-white/10 text-emerald-100 [&>svg]:size-8">${icons.basket}</span>
            <div><p class="text-sm font-bold uppercase tracking-[0.14em] text-emerald-200">Mais tranquilidade</p><h2 class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Comprar não deveria terminar com uma surpresa no caixa.</h2><p class="mt-5 max-w-2xl text-base leading-7 text-emerald-50/75">Durante uma compra é fácil perder a noção do total, principalmente com promoções, preços por peso e muitos produtos no carrinho. O Messo permite acompanhar a compra enquanto ela acontece.</p></div>
          </div>
        </section>

        <section id="beneficios" class="scroll-mt-20 bg-stone-50 px-5 py-20 sm:px-8 sm:py-28">
          <div class="mx-auto max-w-6xl">${sectionHeading('Feito para o dia a dia', 'Mais clareza em cada corredor', 'Tudo o que você precisa para comprar com organização e confiança.')}
            <div class="mt-12 grid gap-4 sm:grid-cols-2">${benefits.map(([icon, title, description]) => `<article class="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-stone-200/70"><span class="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:size-5">${icons[icon]}</span><div><h3 class="font-extrabold">${title}</h3><p class="mt-2 text-sm leading-6 text-stone-500">${description}</p></div></article>`).join('')}</div>
          </div>
        </section>

        <section class="px-5 py-20 sm:px-8 sm:py-28"><div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>${sectionHeading('Na prática', 'Da etiqueta para a sua compra', 'Aponte, confira e adicione. O total é atualizado para você continuar comprando sem perder as contas.')}
            <ul class="mt-8 space-y-4 text-sm font-semibold text-stone-600"><li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-brand-50 text-brand-700 [&>svg]:size-4">${icons.check}</span>Produto e preço apresentados com clareza</li><li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-brand-50 text-brand-700 [&>svg]:size-4">${icons.check}</span>Você confere antes de adicionar</li><li class="flex items-center gap-3"><span class="grid size-6 place-items-center rounded-full bg-brand-50 text-brand-700 [&>svg]:size-4">${icons.check}</span>Total atualizado automaticamente</li></ul>
          </div>${productDemo()}</div>
        </section>

        <section class="bg-brand-50 px-5 py-20 sm:px-8"><div class="mx-auto max-w-6xl">${sectionHeading('No supermercado', 'Preparado para diferentes preços', 'O Messo ajuda você a conferir situações comuns nas etiquetas, sem complicação.')}
          <div class="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">${['Preço normal', 'Preço promocional', 'Produto por peso', 'Mais de um preço'].map((label, index) => `<div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-700/10"><span class="mb-4 grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:size-5">${index % 2 === 0 ? icons.tag : icons.check}</span><p class="text-sm font-extrabold text-stone-800">${label}</p></div>`).join('')}</div>
        </div></section>

        <section class="px-5 py-20 sm:px-8 sm:py-28"><div class="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-brand-800 px-6 py-14 text-center text-white shadow-xl shadow-brand-900/20 sm:px-12 sm:py-16"><h2 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Sua compra, mais fácil de acompanhar.</h2><p class="mx-auto mt-5 max-w-2xl leading-7 text-emerald-50/80">Abra o Messo durante sua próxima ida ao supermercado e acompanhe seus produtos e gastos enquanto compra.</p><a class="mt-8 inline-flex min-h-13 items-center justify-center rounded-xl bg-white px-6 font-extrabold text-brand-900 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href="/app">Começar minha compra <span class="ml-2" aria-hidden="true">→</span></a></div></section>
      </main>
      <footer class="border-t border-stone-200 px-5 py-8 sm:px-8"><div class="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-3"><img class="h-9 w-auto" src="/images/logo-color.png" alt=""><span>Sua compra mais simples de acompanhar.</span></div><p>© ${new Date().getFullYear()} Messo</p></div></footer>
    </div>`
}

function sectionHeading(eyebrow: string, title: string, description: string): string {
  return `<div class="max-w-2xl"><p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">${eyebrow}</p><h2 class="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">${title}</h2><p class="mt-4 leading-7 text-stone-500">${description}</p></div>`
}

function heroDemo(): string {
  return `<div class="mx-auto w-full max-w-md" aria-label="Exemplo de uma compra no Messo"><div class="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-2xl shadow-brand-900/15 sm:p-6"><div class="flex items-center justify-between border-b border-stone-100 pb-4"><div><p class="text-xs font-bold uppercase tracking-wider text-stone-400">Minha compra</p><p class="mt-1 font-extrabold">3 itens no carrinho</p></div><span class="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:size-6">${icons.basket}</span></div><div class="space-y-3 py-5"><div class="flex items-center justify-between rounded-2xl bg-stone-50 p-4"><div><p class="text-sm font-bold">Arroz 5kg</p><p class="mt-1 text-xs text-stone-400">1 unidade</p></div><strong class="text-brand-800">R$ 29,90</strong></div><div class="flex items-center justify-between rounded-2xl bg-stone-50 p-4"><div><p class="text-sm font-bold">Feijão 1kg</p><p class="mt-1 text-xs text-stone-400">2 unidades</p></div><strong class="text-brand-800">R$ 17,80</strong></div></div><div class="flex items-end justify-between rounded-2xl bg-brand-900 p-5 text-white"><span class="text-xs font-bold uppercase tracking-wider text-emerald-200">Total da compra</span><strong class="text-2xl">R$ 47,70</strong></div></div></div>`
}

function productDemo(): string {
  return `<div class="mx-auto w-full max-w-md rounded-[2rem] bg-stone-100 p-4 sm:p-7"><div class="rounded-3xl bg-white p-5 shadow-card"><div class="mb-5 flex items-center gap-3"><span class="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:size-5">${icons.camera}</span><div><p class="text-xs font-bold uppercase tracking-wider text-stone-400">Etiqueta encontrada</p><p class="mt-0.5 text-xs text-stone-500">Confira as informações</p></div></div><div class="rounded-2xl border border-stone-200 p-4"><p class="text-xs font-bold uppercase tracking-wider text-stone-400">Produto</p><p class="mt-1 text-lg font-extrabold">Arroz 5kg</p><div class="my-4 h-px bg-stone-100"></div><p class="text-xs font-bold uppercase tracking-wider text-stone-400">Preço</p><p class="mt-1 text-2xl font-extrabold text-brand-800">R$ 29,90</p></div><button class="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-extrabold text-white" type="button" tabindex="-1">Adicionar à compra</button><div class="mt-4 flex items-center justify-between px-1 text-sm"><span class="text-stone-500">Novo total</span><strong class="text-brand-800">R$ 47,70</strong></div></div></div>`
}
