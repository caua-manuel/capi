export type Aparencia = 'automatica' | 'clara' | 'escura';
export type Tema = 'claro' | 'escuro';

export const CHAVE_APARENCIA = 'aparencia';
/** Cópia síncrona da escolha, para o tema certo aparecer antes do app terminar de carregar. */
const CHAVE_LOCAL = 'capi-aparencia';
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

/** Claro é o padrão; o escuro só vale quando a pessoa escolhe (ou deixa em Automática e o aparelho está no escuro). */
export function resolverTema(aparencia: Aparencia | undefined, sistemaEscuro: boolean): Tema {
  if (aparencia === 'escura') return 'escuro';
  if (aparencia === 'automatica') return sistemaEscuro ? 'escuro' : 'claro';
  return 'claro';
}

export function aparenciaSalva(): Aparencia {
  try {
    const v = window.localStorage.getItem(CHAVE_LOCAL);
    return v === 'escura' || v === 'automatica' ? v : 'clara';
  } catch {
    return 'clara';
  }
}

export function guardarAparencia(aparencia: Aparencia): void {
  try { window.localStorage.setItem(CHAVE_LOCAL, aparencia); } catch { /* sem armazenamento local: vale só nesta sessão */ }
}

/** Põe o tema no documento e acerta a cor da barra do navegador. */
export function aplicarAparencia(aparencia: Aparencia): void {
  const tema = resolverTema(aparencia, window.matchMedia(CONSULTA_ESCURO).matches);
  const raiz = document.documentElement;
  raiz.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'escuro' ? '#080C17' : '#F1F3F7');
}

/** Para a Automática: avisa quando o aparelho troca de tema. Devolve como parar de ouvir. */
export function ouvirTemaDoAparelho(aoMudar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_ESCURO);
  consulta.addEventListener('change', aoMudar);
  return () => consulta.removeEventListener('change', aoMudar);
}
