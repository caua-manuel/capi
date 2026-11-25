import { createContext, useContext, type ReactNode } from 'react';
import type { Centavos } from '../motor/dinheiro';
import { formatarReais, formatarReaisInteiros } from './formato';

export const CHAVE_MODO_DISCRETO = 'modo-discreto';
export const VALOR_ESCONDIDO = 'R$ ••••';

const ContextoDiscreto = createContext(false);

export function ProvedorDiscreto({ ligado, children }: { ligado: boolean; children: ReactNode }) {
  return <ContextoDiscreto.Provider value={ligado}>{children}</ContextoDiscreto.Provider>;
}

export function useModoDiscreto(): boolean {
  return useContext(ContextoDiscreto);
}

/** Todo valor em R$ do app passa por aqui, para o Modo discreto esconder tudo de uma vez. */
export function Valor({ centavos, semCentavos }: { centavos: Centavos; semCentavos?: boolean }) {
  const discreto = useModoDiscreto();
  if (discreto) return <span aria-label="Valor escondido">{VALOR_ESCONDIDO}</span>;
  return <>{semCentavos ? formatarReaisInteiros(centavos) : formatarReais(centavos)}</>;
}
