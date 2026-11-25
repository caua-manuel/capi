import type { Centavos } from './dinheiro';

/**
 * Tabela de Parâmetros: valores de mercado atualizáveis usados nos cálculos.
 * Nunca usar estes números direto no código: o Motor sempre recebe a tabela na entrada.
 * A tela de Ajustes (issue 21) vai permitir editar; até lá vale a tabela padrão.
 */
export interface Parametros {
  /** Data da última atualização, AAAA-MM-DD. */
  atualizadoEm: string;
  /** Selic ao ano, fração. */
  selicAnual: number;
  /** CDI ao ano, fração. */
  cdiAnual: number;
  /** IOF em compras internacionais no cartão, fração. */
  iofInternacional: number;
  /** IR da renda fixa por prazo (tabela regressiva), fração. */
  irRendaFixa: { ate180Dias: number; ate360Dias: number; ate720Dias: number; acima720Dias: number };
  /** Salário mínimo mensal. */
  salarioMinimo: Centavos;
  /** Rendimento mensal líquido conservador para as Metas (renda fixa pós-fixada, já sem IR). */
  rendimentoMensalConservador: number;
  /** Rendimento mensal da poupança, para a dica de dinheiro parado. */
  poupancaMensal: number;
}

export const PARAMETROS_PADRAO: Parametros = {
  atualizadoEm: '2026-11-24',
  selicAnual: 0.15,
  cdiAnual: 0.149,
  iofInternacional: 0.035,
  irRendaFixa: { ate180Dias: 0.225, ate360Dias: 0.2, ate720Dias: 0.175, acima720Dias: 0.15 },
  salarioMinimo: 162100,
  rendimentoMensalConservador: 0.008,
  poupancaMensal: 0.005,
};
