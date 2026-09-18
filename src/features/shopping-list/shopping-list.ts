export function renderShoppingList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-dvh bg-stone-50 text-stone-900">
      <header class="bg-brand-800 text-white">
        <div class="mx-auto flex max-w-3xl items-center justify-between px-5 pb-7 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
          <a class="group flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" href="#main-content" aria-label="Messo, ir para o conteúdo principal">
            <span class="grid size-10 place-items-center rounded-xl bg-white/12 shadow-inner ring-1 ring-white/15" aria-hidden="true">
              <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M5 19V8.8A2.8 2.8 0 0 1 7.8 6h8.4A2.8 2.8 0 0 1 19 8.8V19" stroke-linecap="round"/>
                <path d="M9 8V5.5a3 3 0 0 1 6 0V8M8 12h8M8 15.5h5" stroke-linecap="round"/>
              </svg>
            </span>
            <span>
              <span class="block text-2xl font-bold leading-none tracking-tight">messo</span>
              <span class="mt-1 block text-[0.68rem] font-medium uppercase tracking-[0.19em] text-emerald-100/80">compras mais leves</span>
            </span>
          </a>
          <span class="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50 ring-1 ring-white/10">Minha compra</span>
        </div>
      </header>

      <main id="main-content" class="mx-auto max-w-3xl px-4 pb-40 sm:px-8">
        <section class="relative -mt-3 rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-200/60 sm:p-7" aria-labelledby="add-product-title">
          <div class="mb-5">
            <p class="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-brand-700">Novo item</p>
            <h1 id="add-product-title" class="text-xl font-bold tracking-tight text-stone-900">O que vai para o carrinho?</h1>
          </div>

          <form aria-describedby="foundation-note">
            <div class="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <div>
                <label class="mb-2 block text-sm font-semibold text-stone-700" for="product-name">Produto</label>
                <input class="field" id="product-name" name="product-name" type="text" placeholder="Ex.: Arroz integral" autocomplete="off" />
              </div>
              <div>
                <label class="mb-2 block text-sm font-semibold text-stone-700" for="product-price">Preço</label>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-stone-500" aria-hidden="true">R$</span>
                  <input class="field pl-12" id="product-price" name="product-price" type="text" inputmode="decimal" placeholder="0,00" />
                </div>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-[1fr_auto] gap-3">
              <button class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 active:translate-y-px" type="button">
                <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                Adicionar
              </button>
              <button class="grid size-12 place-items-center rounded-xl border border-stone-200 bg-stone-50 text-stone-400" type="button" disabled aria-label="Ler preço pela câmera — disponível em breve" title="Disponível em breve">
                <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1-1.5h6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.25"/></svg>
              </button>
            </div>
            <p id="foundation-note" class="mt-3 text-xs leading-relaxed text-stone-400">A leitura de preços pela câmera estará disponível em uma próxima etapa.</p>
          </form>
        </section>

        <section class="mt-8" aria-labelledby="shopping-list-title">
          <div class="mb-4 flex items-center justify-between px-1">
            <h2 id="shopping-list-title" class="text-lg font-bold tracking-tight">Sua lista</h2>
            <span class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">0 itens</span>
          </div>

          <div class="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-10 text-center">
            <span class="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
              <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 7h12l-1 13H7L6 7Z" stroke-linejoin="round"/><path d="M9 9V5a3 3 0 0 1 6 0v4" stroke-linecap="round"/></svg>
            </span>
            <h3 class="font-bold text-stone-800">Nenhum produto adicionado ainda</h3>
            <p class="mt-2 max-w-xs text-sm leading-6 text-stone-500">Use os campos acima para começar a organizar sua compra.</p>
          </div>
        </section>
      </main>

      <aside class="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-brand-900 text-white shadow-summary" aria-label="Resumo da compra">
        <div class="mx-auto flex max-w-3xl items-center justify-between gap-6 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/70">Quantidade</p>
            <p class="mt-1 text-base font-bold">0 itens</p>
          </div>
          <div class="h-10 w-px bg-white/15" aria-hidden="true"></div>
          <div class="flex-1 text-right">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/70">Total da compra</p>
            <p class="mt-0.5 text-2xl font-extrabold tracking-tight">R$ 0,00</p>
          </div>
        </div>
      </aside>
    </div>
  `
}
