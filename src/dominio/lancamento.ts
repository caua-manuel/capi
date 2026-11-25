import type { Centavos } from '../motor/dinheiro';

export type OrigemDoLancamento = 'manual' | 'applepay' | 'importacao';

export interface Lancamento {
  id: string;
  valor: Centavos;
  loja: string;
  categoriaId: string;
  /** Data da compra, AAAA-MM-DD. */
  data: string;
  origem: OrigemDoLancamento;
  /** Momento do registro, ISO. */
  criadoEm: string;
  /** Linha da Fatura que este Lançamento representa, depois da Conciliação ou Importação. */
  idDaLinha?: string;
  /** Parcela "x/y", quando veio de uma compra parcelada. */
  parcela?: { atual: number; total: number };
}
