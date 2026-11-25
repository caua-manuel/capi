import type { Lancamento } from '../dominio/lancamento';
import { diferencaEmDias, somarDias } from './datas';
import type { Centavos } from './dinheiro';
import { calcular, type EntradaDoMotor } from './index';
import type { EstadoDoTeto } from './plano';

export interface CategoriaNoCheckin {
  categoriaId: string;
  /** O que resta no Teto do mês. */
  restante: Centavos;
  /** A parte justa do que resta para os dias até domingo. */
  livreAteDomingo: Centavos;
  uso: number;
  estado: EstadoDoTeto;
}

export interface Checkin {
  /** 0 quando hoje é domingo. */
  diasAteDomingo: number;
  /** Fim da semana (domingo), AAAA-MM-DD. */
  domingo: string;
  aindaPodeGastar: Centavos;
  porDia: Centavos;
  livrePorCategoria: CategoriaNoCheckin[];
  /** Semanas seguidas dentro do Plano, contando só semanas com Lançamentos. */
  semanasNoPlano: number;
  /** Gastos do Apple Pay dos últimos 7 dias que ficaram em Outros, para confirmar. */
  semCategoria: Lancamento[];
}

const DIAS_DO_MES_NA_SEMANA = 30;
const SEMANAS_MAXIMAS = 52;

const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();

/**
 * Sequência de semanas dentro do Plano: cada semana (segunda a domingo) vale se teve Lançamentos
 * e o gasto ficou dentro do ritmo do mês (limite do mês ÷ 30 × 7). Usa o limite do mês de hoje para todas as semanas.
 */
function semanasSeguidas(hoje: string, lancamentos: readonly Lancamento[], limiteDoMes: Centavos): number {
  const ehDomingo = diaDaSemana(hoje) === 0;
  // Semana em andamento ainda não conta: o primeiro fim de semana a avaliar é o de hoje (domingo) ou o anterior.
  const primeiroDomingo = ehDomingo ? hoje : somarDias(hoje, -diaDaSemana(hoje));
  const porSemana = Math.round((limiteDoMes * 7) / DIAS_DO_MES_NA_SEMANA);
  let seguidas = 0;
  for (let i = 0; i < SEMANAS_MAXIMAS; i++) {
    const fim = somarDias(primeiroDomingo, -7 * i);
    const inicio = somarDias(fim, -6);
    const daSemana = lancamentos.filter((l) => l.data >= inicio && l.data <= fim);
    const total = daSemana.reduce((s, l) => s + l.valor, 0);
    if (daSemana.length === 0 || total > porSemana) break;
    seguidas++;
  }
  return seguidas;
}

/** O Check-in de domingo: quanto ainda pode gastar até domingo por Categoria e a sequência de semanas. */
export function fazerCheckin(e: EntradaDoMotor): Checkin {
  const { plano } = calcular(e);
  const diasAteDomingo = (7 - diaDaSemana(e.hoje)) % 7;
  const domingo = somarDias(e.hoje, diasAteDomingo);
  const diasRestantesNoMes = Math.max(1, plano.diasRestantes);

  const livrePorCategoria = plano.tetos.map((t) => {
    const restante = Math.max(0, t.restante);
    const parte = Math.round((restante * Math.min(diasAteDomingo + 1, diasRestantesNoMes)) / diasRestantesNoMes);
    return { categoriaId: t.categoriaId, restante, livreAteDomingo: Math.min(restante, parte), uso: t.uso, estado: t.estado };
  }).sort((a, b) => b.uso - a.uso);

  const semCategoria = e.lancamentos.filter((l) => l.origem === 'applepay' && l.categoriaId === 'outros' && diferencaEmDias(l.data, e.hoje) >= 0 && diferencaEmDias(l.data, e.hoje) < 7);

  return {
    diasAteDomingo, domingo, aindaPodeGastar: plano.aindaPodeGastar, porDia: plano.porDia,
    livrePorCategoria, semanasNoPlano: semanasSeguidas(e.hoje, e.lancamentos, plano.limiteDoMes), semCategoria,
  };
}
