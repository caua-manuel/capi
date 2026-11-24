import type { Centavos } from '../motor/dinheiro';

export type TipoDeRenda = 'fixa' | 'varia-pouco' | 'varia-muito';
export type Trabalho = 'clt' | 'servidor' | 'pj-autonomo' | 'empresa-familia' | 'estudante' | 'outro';
export type ComQuemMora = 'sozinho' | 'familia' | 'parceiro' | 'republica';
export type OndeGuarda = 'conta' | 'poupanca' | 'cdb' | 'tesouro' | 'acoes' | 'cripto' | 'outro';
export type TipoDeDivida = 'cartao-rotativo' | 'cheque-especial' | 'emprestimo' | 'financiamento' | 'outro';

export type Objetivo =
  | 'quitar-dividas'
  | 'reserva'
  | 'juntar-valor'
  | 'viagem'
  | 'comprar'
  | 'investir'
  | 'morar-sozinho'
  | 'organizar'
  | 'aposentadoria';

export interface Divida {
  id: string;
  nome: string;
  tipo: TipoDeDivida;
  saldo: Centavos;
  /** Juros ao mês, como fração: 0,08 = 8% a.m. */
  jurosMensal: number;
  parcela: Centavos;
  emAtraso: boolean;
}

/** Um Fixo declarado no Onboarding (pergunta 6). Vira um Fixo cadastrado. */
export interface FixoDeclarado {
  id: string;
  nome: string;
  valor: Centavos;
  categoriaId: string;
  dia: number;
}

export interface AnualDeclarado {
  id: string;
  nome: string;
  valor: Centavos;
  /** Mês do ano em que vence, 1 a 12. */
  mes: number;
}

/** As respostas do Onboarding. Valores "não sei" viram estimativas (ver `estimado`). */
export interface RespostasDoOnboarding {
  /** Pergunta 1 e 2. */
  renda: {
    valor: Centavos;
    tipo: TipoDeRenda;
    /** Renda dos últimos meses (até 6), quando varia. */
    ultimosMeses: Centavos[];
  };
  /** Pergunta 3. */
  trabalho: Trabalho;
  /** Pergunta 5. */
  moradia: { comQuem: ComQuemMora; valor: Centavos };
  /** Pergunta 6: fixos fora do cartão. */
  fixos: FixoDeclarado[];
  /** Estimativa dos gastos do dia a dia (cartão, Pix, dinheiro) por Grupo, até chegar a primeira Fatura. */
  variaveis: { essencial: Centavos; estiloDeVida: Centavos };
  /** Pergunta 8 (opcional). */
  anuais: AnualDeclarado[];
  /** Pergunta 9. */
  dividas: Divida[];
  /** Pergunta 10. */
  guardado: { valor: Centavos; onde: OndeGuarda };
  /** Pergunta 11 (opcional). */
  guardaPorMes?: Centavos;
  /** Pergunta 13. */
  objetivos: Objetivo[];
  /** Pergunta extra da Reserva: alguém depende de você? */
  temDependentes?: boolean;
  /** Perguntas marcadas como "não sei / estimar". */
  estimado: string[];
  /** Quando o Onboarding foi respondido, AAAA-MM-DD. */
  respondidoEm: string;
}
