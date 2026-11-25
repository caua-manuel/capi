import type { Categoria, Grupo } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import { diasNoMes, mesDaData, somarMeses } from './datas';
import type { Diagnostico } from './diagnostico';
import type { Centavos } from './dinheiro';
import type { OcorrenciaDeFixo } from './fixos';

export type EstadoDoTeto = 'normal' | 'atencao' | 'estourado';

export interface TetoDaCategoria {
  categoriaId: string;
  teto: Centavos;
  /** Gasto no Mês do plano, pela data da compra. */
  gasto: Centavos;
  restante: Centavos;
  /** Fração do Teto já usada. */
  uso: number;
  estado: EstadoDoTeto;
  /** Média mensal dos últimos meses, base do Teto. */
  media: Centavos;
}

export interface Plano {
  mes: string;
  /** Aporte total do mês para Metas e Dívidas. */
  guardarPorMes: Centavos;
  /** Quanto dá para gastar no dia a dia neste mês, já sem Fixos, parcelas, anuais e o que guardar. */
  limiteDoMes: Centavos;
  gastoDoMes: Centavos;
  aindaPodeGastar: Centavos;
  porDia: Centavos;
  diasRestantes: number;
  tetos: TetoDaCategoria[];
  /** Primeiro mês, sem histórico: conta normalmente, mas ainda sem Tetos. */
  mesSemTetos: boolean;
}

// Regras de estado das barras (DESIGN.md e motor-financeiro.md).
const ATENCAO_A_PARTIR_DE = 0.85;
const MESES_DE_HISTORICO = 3;

/** Arredonda para baixo em reais de 10 em 10, para os Tetos ficarem redondos e nunca passarem do limite. */
const redondo = (v: number): Centavos => Math.max(0, Math.floor(v / 1000) * 1000);

export interface EntradaDoPlano {
  hoje: string;
  diagnostico: Diagnostico;
  fixosDoMes: readonly OcorrenciaDeFixo[];
  categorias: readonly Categoria[];
  lancamentos: readonly Lancamento[];
}

export function planejar(e: EntradaDoPlano): Plano {
  const mes = mesDaData(e.hoje);
  const d = e.diagnostico;
  const grupoDe = (id: string): Grupo => e.categorias.find((c) => c.id === id)?.grupo ?? 'estilo-de-vida';

  const compromissos = d.fixos + d.parcelas + d.anuaisPorMes;
  const livreDepoisDosCompromissos = Math.max(0, d.renda - compromissos);
  const guardarPorMes = Math.min(Math.round((d.divisaoIdeal.guardar / 100) * d.renda), livreDepoisDosCompromissos);
  const limiteDoMes = livreDepoisDosCompromissos - guardarPorMes;

  // Média mensal por Categoria nos últimos meses que têm algum Lançamento.
  const mesesDoHistorico = Array.from({ length: MESES_DE_HISTORICO }, (_, i) => somarMeses(mes, -(i + 1)));
  const doHistorico = e.lancamentos.filter((l) => mesesDoHistorico.includes(mesDaData(l.data)));
  const mesesComDados = new Set(doHistorico.map((l) => mesDaData(l.data))).size;
  const media = new Map<string, number>();
  for (const l of doHistorico) media.set(l.categoriaId, (media.get(l.categoriaId) ?? 0) + l.valor);
  for (const [id, total] of media) media.set(id, total / Math.max(1, mesesComDados));

  const tetoBase = new Map<string, Centavos>();
  if (mesesComDados > 0) {
    const essenciais = [...media].filter(([id]) => grupoDe(id) === 'essencial');
    const estilo = [...media].filter(([id]) => grupoDe(id) === 'estilo-de-vida');
    const totalEssencial = essenciais.reduce((s, [, v]) => s + v, 0);
    const fatorEssencial = totalEssencial > limiteDoMes ? limiteDoMes / totalEssencial : 1;
    for (const [id, v] of essenciais) tetoBase.set(id, redondo(v * fatorEssencial));
    const usadoEssencial = essenciais.reduce((s, [id]) => s + (tetoBase.get(id) ?? 0), 0);

    const fixosDeEstilo = e.fixosDoMes.filter((f) => grupoDe(f.categoriaId) === 'estilo-de-vida').reduce((s, f) => s + f.valor, 0);
    const tetoDoGrupoEstilo = Math.max(0, (d.divisaoIdeal.estiloDeVida / 100) * d.renda - fixosDeEstilo);
    const paraEstilo = Math.min(limiteDoMes - usadoEssencial, tetoDoGrupoEstilo);
    const totalEstilo = estilo.reduce((s, [, v]) => s + v, 0);
    const fatorEstilo = totalEstilo > paraEstilo ? Math.max(0, paraEstilo) / totalEstilo : 1;
    for (const [id, v] of estilo) tetoBase.set(id, redondo(v * fatorEstilo));
  }

  const doMes = e.lancamentos.filter((l) => mesDaData(l.data) === mes);
  const gastoPorCategoria = new Map<string, Centavos>();
  for (const l of doMes) gastoPorCategoria.set(l.categoriaId, (gastoPorCategoria.get(l.categoriaId) ?? 0) + l.valor);

  const tetos: TetoDaCategoria[] = [...tetoBase].map(([categoriaId, teto]) => {
    const gasto = gastoPorCategoria.get(categoriaId) ?? 0;
    const uso = teto > 0 ? gasto / teto : gasto > 0 ? Number.POSITIVE_INFINITY : 0;
    const estado: EstadoDoTeto = uso > 1 ? 'estourado' : uso >= ATENCAO_A_PARTIR_DE ? 'atencao' : 'normal';
    return { categoriaId, teto, gasto, restante: teto - gasto, uso, estado, media: Math.round(media.get(categoriaId) ?? 0) };
  }).sort((a, b) => b.teto - a.teto);

  const gastoDoMes = doMes.reduce((s, l) => s + l.valor, 0);
  const aindaPodeGastar = limiteDoMes - gastoDoMes;
  const diasRestantes = diasNoMes(mes) - Number(e.hoje.slice(8, 10)) + 1;
  const porDia = aindaPodeGastar > 0 ? Math.floor(aindaPodeGastar / diasRestantes) : 0;

  return { mes, guardarPorMes, limiteDoMes, gastoDoMes, aindaPodeGastar, porDia, diasRestantes, tetos, mesSemTetos: tetoBase.size === 0 };
}
