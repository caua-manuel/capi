import type { Centavos } from '../motor/dinheiro';

export type FormaDePagamento = 'cartao' | 'fora';

/** Um Fixo vale de um Mês do plano em diante; editar cria uma nova versão sem mudar os meses fechados. */
export interface VersaoDoFixo {
  /** Primeiro Mês do plano em que esta versão vale, AAAA-MM. */
  aPartirDe: string;
  nome: string;
  valor: Centavos;
  /** Dia do mês (1 a 31); em meses mais curtos cai no último dia. */
  dia: number;
  categoriaId: string;
  forma: FormaDePagamento;
}

export interface Fixo {
  id: string;
  versoes: VersaoDoFixo[];
  /** Último Mês do plano em que o Fixo conta, AAAA-MM. Ausente = continua. */
  encerradoEm?: string;
}
