/** O que o navegador conta sobre si; vem de `navigator` e `matchMedia` e é passado de fora para dar para testar. */
export interface Ambiente {
  userAgent: string;
  plataforma: string;
  pontosDeToque: number;
  /** `navigator.standalone`: só existe no Safari do iOS, verdadeiro quando aberto pelo ícone. */
  standaloneDoIOS: boolean;
  /** `matchMedia('(display-mode: standalone)').matches`. */
  modoDeExibicaoStandalone: boolean;
}

const OUTROS_NAVEGADORES_DO_IOS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Brave/i;

function ehIOS(a: Ambiente): boolean {
  if (/iPhone|iPad|iPod/.test(a.userAgent)) return true;
  // O iPad moderno se apresenta como Mac, mas tem tela de toque.
  return a.plataforma === 'MacIntel' && a.pontosDeToque > 1;
}

/**
 * No iOS, o Safari e o app instalado guardam os dados em lugares separados (ADR 0002).
 * A tela "Instale a Capi primeiro" só vale para quem está no Safari do iOS, fora da Tela de Início.
 */
export function precisaInstalar(a: Ambiente): boolean {
  if (!ehIOS(a)) return false;
  if (OUTROS_NAVEGADORES_DO_IOS.test(a.userAgent)) return false;
  return !a.standaloneDoIOS && !a.modoDeExibicaoStandalone;
}

export function lerAmbiente(): Ambiente {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    plataforma: nav.platform ?? '',
    pontosDeToque: nav.maxTouchPoints ?? 0,
    standaloneDoIOS: nav.standalone === true,
    modoDeExibicaoStandalone: window.matchMedia('(display-mode: standalone)').matches,
  };
}

export type EtapaDaInstalacao = 'orientacao' | 'ja-instalei' | 'confirmar';
export type AcaoDaInstalacao = 'ja-instalei' | 'continuar' | 'voltar';

/** Os caminhos da tela: "Já instalei" nunca libera o navegador; só a confirmação do "Continuar" libera. */
export function proximaEtapa(etapa: EtapaDaInstalacao, acao: AcaoDaInstalacao): { etapa: EtapaDaInstalacao; dispensar: boolean } {
  if (acao === 'voltar') return { etapa: 'orientacao', dispensar: false };
  if (acao === 'ja-instalei') return { etapa: 'ja-instalei', dispensar: false };
  if (etapa === 'confirmar') return { etapa: 'confirmar', dispensar: true };
  return { etapa: 'confirmar', dispensar: false };
}
