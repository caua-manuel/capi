import type { Centavos } from '../motor/dinheiro';
import type { Objetivo } from './onboarding';

/** Prioridade da Meta: 1 é a mais importante. */
export type Prioridade = 1 | 2 | 3;

/** Uma Meta criada pelo Usuário. Colchão, Dívida cara e Reserva são montadas pelo Motor. */
export interface Meta {
  id: string;
  nome: string;
  objetivo: Objetivo;
  valorAlvo: Centavos;
  valorAtual: Centavos;
  /** Mês-alvo, AAAA-MM. Sem data, a Meta é de longo prazo. */
  dataAlvo?: string;
  prioridade: Prioridade;
  /** Pode mexer no dinheiro antes da data? */
  podeMexer: boolean;
  /** Viagem para fora do Brasil: alerta de câmbio. */
  internacional?: boolean;
}
