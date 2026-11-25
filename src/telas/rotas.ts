// Rotas simples pelo caminho do endereço, relativas à base do app (/capi/ no GitHub Pages).

export type Rota = 'inicio' | 'lancar' | 'ajustes' | 'atalho' | 'categorias' | 'onboarding' | 'diagnostico';

const ROTAS: readonly Rota[] = ['lancar', 'ajustes', 'atalho', 'categorias', 'onboarding', 'diagnostico'];

export function rotaAtual(): Rota {
  const base = import.meta.env.BASE_URL;
  const caminho = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : window.location.pathname;
  const nome = caminho.replace(/^\/+|\/+$/g, '');
  return (ROTAS as readonly string[]).includes(nome) ? (nome as Rota) : 'inicio';
}

export function enderecoDaRota(rota: Rota): string {
  return `${import.meta.env.BASE_URL}${rota === 'inicio' ? '' : rota}`;
}

export function navegar(rota: Rota, substituir = false): void {
  const url = enderecoDaRota(rota);
  if (substituir) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Endereço completo do app, para montar a URL do Atalho. */
export function enderecoCompleto(rota: Rota): string {
  return new URL(enderecoDaRota(rota), window.location.origin).toString();
}
