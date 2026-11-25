import type { Centavos } from '../motor/dinheiro';

export type TipoDeLinha = 'compra' | 'iof' | 'estorno' | 'pagamento' | 'encargo';

/**
 * Uma linha da Fatura já lida pelo Importador. É o contrato entre o Importador (um por banco)
 * e o resto do app. O texto colado nunca é guardado: só estas linhas.
 */
export interface LinhaDeFatura {
  /** Estável entre importações da mesma Fatura: evita duplicar ao importar duas vezes. */
  id: string;
  /** Data da compra, AAAA-MM-DD. */
  data: string;
  loja: string;
  /** Sempre positivo; o tipo diz se é compra, estorno etc. */
  valor: Centavos;
  tipo: TipoDeLinha;
  /** Parcela "x/y". */
  parcela?: { atual: number; total: number };
  /** Compra internacional, em moeda estrangeira. */
  emDolar?: boolean;
  /** Categoria escolhida ou sugerida depois da Importação. */
  categoriaId?: string;
}

/** O extrato de um ciclo do cartão, entre dois fechamentos. */
export interface Fatura {
  id: string;
  /** Data de fechamento do ciclo, AAAA-MM-DD. */
  fechamento: string;
  vencimento: string;
  linhas: LinhaDeFatura[];
}
