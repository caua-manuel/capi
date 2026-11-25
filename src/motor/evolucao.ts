import type { Categoria, Grupo } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import { mesDaData, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import { noCartao } from './previsao';

const MESES_NO_GRAFICO = 6;
/** Quantas altas seguidas entre meses fechados viram destaque. */
const ALTAS_PARA_DESTACAR = 3;

export interface MesDaEvolucao {
  /** AAAA-MM */
  mes: string;
  total: Centavos;
  porGrupo: Record<Grupo, Centavos>;
  /** É o mês de hoje: o número ainda vai crescer. */
  emAndamento: boolean;
}

export interface AltaSeguida {
  /** Quantas altas seguidas, entre meses fechados. */
  meses: number;
  /** Primeiro e último mês da sequência, AAAA-MM. */
  de: string;
  ate: string;
  /** Quanto a Fatura cresceu do primeiro ao último mês da sequência. */
  aumento: Centavos;
}

export interface EvolucaoDaFatura {
  meses: MesDaEvolucao[];
  /** Nulo quando a Fatura não cresceu 3 meses seguidos. */
  altaSeguida: AltaSeguida | null;
}

export interface EntradaDaEvolucao {
  hoje: string;
  lancamentos: readonly Lancamento[];
  categorias: readonly Categoria[];
}

/** Os últimos 6 meses do que foi pago no cartão, por Grupo, pela data da compra. */
export function evolucaoDaFatura(e: EntradaDaEvolucao): EvolucaoDaFatura {
  const atual = mesDaData(e.hoje);
  const grupoDe = (id: string): Grupo => e.categorias.find((c) => c.id === id)?.grupo ?? 'estilo-de-vida';
  const meses: MesDaEvolucao[] = Array.from({ length: MESES_NO_GRAFICO }, (_, i) => ({
    mes: somarMeses(atual, i - (MESES_NO_GRAFICO - 1)),
    total: 0,
    porGrupo: { essencial: 0, 'estilo-de-vida': 0, 'guardar-quitar': 0 },
    emAndamento: i === MESES_NO_GRAFICO - 1,
  }));
  for (const l of e.lancamentos) {
    if (!noCartao(l)) continue;
    const m = meses.find((x) => x.mes === mesDaData(l.data));
    if (!m) continue;
    m.total += l.valor;
    m.porGrupo[grupoDe(l.categoriaId)] += l.valor;
  }

  // Só meses fechados: o mês em andamento ainda está incompleto e não pode contar como queda nem como alta.
  const fechados = meses.filter((m) => !m.emAndamento);
  let altas = 0;
  for (let i = fechados.length - 1; i > 0; i--) {
    const m = fechados[i]!;
    const anterior = fechados[i - 1]!;
    if (anterior.total > 0 && m.total > anterior.total) altas++;
    else break;
  }
  const ultimo = fechados[fechados.length - 1]!;
  const primeiro = fechados[fechados.length - 1 - altas]!;
  const altaSeguida = altas >= ALTAS_PARA_DESTACAR
    ? { meses: altas, de: primeiro.mes, ate: ultimo.mes, aumento: ultimo.total - primeiro.total }
    : null;
  return { meses, altaSeguida };
}
