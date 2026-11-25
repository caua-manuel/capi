import type { Divida } from '../dominio/onboarding';
import type { Centavos } from './dinheiro';

export type Metodo = 'avalanche' | 'bola-de-neve';

export interface Quitacao {
  /** Meses até quitar tudo; nulo se não quita em 50 anos. */
  meses: number | null;
  jurosTotais: Centavos;
  /** Ordem em que as dívidas recebem o extra. */
  ordem: string[];
  /** Mês (1, 2, …) em que cada dívida termina. */
  quitacao: Record<string, number>;
}

export interface Comparacao {
  avalanche: Quitacao;
  bolaDeNeve: Quitacao;
  /** Juros a mais da bola de neve em relação à avalanche. */
  diferencaEmReais: Centavos;
  /** Nulo quando algum dos métodos não quita em 50 anos. */
  diferencaEmMeses: number | null;
  recomendado: Metodo;
}

export interface AnaliseDasDividas extends Comparacao {
  extraPorMes: Centavos;
  renegociacao: {
    podePagarPorMes: Centavos;
    credores: { dividaId: string; nome: string; trocarRotativo: boolean }[];
  };
  apertoGrave: boolean;
  ajuda: string[];
}

const LIMITE_DE_MESES = 600;
const MIN_DE_DIVIDAS_PEQUENAS = 3;
const APERTO_GRAVE_EM_MESES_DE_RENDA = 6;
const AJUDA = ['Serasa Limpa Nome', 'Desenrola', 'o próprio credor', 'Procon'];

function ordenar(dividas: readonly Divida[], metodo: Metodo): Divida[] {
  return [...dividas].sort((a, b) => (metodo === 'avalanche' ? b.jurosMensal - a.jurosMensal || a.saldo - b.saldo : a.saldo - b.saldo || b.jurosMensal - a.jurosMensal));
}

/**
 * Simula mês a mês: juros entram no saldo, cada dívida recebe a parcela mínima
 * e o extra (mais as parcelas das que já acabaram) vai para a primeira da ordem.
 */
export function simularQuitacao(dividas: readonly Divida[], extraPorMes: Centavos, metodo: Metodo): Quitacao {
  const ordem = ordenar(dividas, metodo);
  const saldo = new Map(ordem.map((d) => [d.id, d.saldo]));
  const orcamento = ordem.reduce((s, d) => s + d.parcela, 0) + extraPorMes;
  const quitacao: Record<string, number> = {};
  let jurosTotais = 0;

  for (let mes = 1; mes <= LIMITE_DE_MESES; mes++) {
    let livre = orcamento;
    for (const d of ordem) {
      const s = saldo.get(d.id)!;
      if (s <= 0) continue;
      const juros = s * d.jurosMensal;
      jurosTotais += juros;
      const pago = Math.min(d.parcela, s + juros, livre);
      saldo.set(d.id, s + juros - pago);
      livre -= pago;
    }
    for (const d of ordem) {
      if (livre <= 0) break;
      const s = saldo.get(d.id)!;
      if (s <= 0) continue;
      const pago = Math.min(s, livre);
      saldo.set(d.id, s - pago);
      livre -= pago;
    }
    for (const d of ordem) if ((saldo.get(d.id) ?? 0) <= 0.5 && quitacao[d.id] === undefined) quitacao[d.id] = mes;
    if (Object.keys(quitacao).length === ordem.length) {
      return { meses: mes, jurosTotais: Math.round(jurosTotais), ordem: ordem.map((d) => d.id), quitacao };
    }
  }
  return { meses: null, jurosTotais: Math.round(jurosTotais), ordem: ordem.map((d) => d.id), quitacao };
}

/** Compara avalanche e bola de neve. Bola de neve só com 3+ dívidas pequenas (até 1 renda cada). */
export function compararMetodos(dividas: readonly Divida[], extraPorMes: Centavos, renda: Centavos): Comparacao {
  const avalanche = simularQuitacao(dividas, extraPorMes, 'avalanche');
  const bolaDeNeve = simularQuitacao(dividas, extraPorMes, 'bola-de-neve');
  const pequenas = dividas.filter((d) => d.saldo <= renda).length;
  return {
    avalanche, bolaDeNeve,
    diferencaEmReais: bolaDeNeve.jurosTotais - avalanche.jurosTotais,
    diferencaEmMeses: bolaDeNeve.meses !== null && avalanche.meses !== null ? bolaDeNeve.meses - avalanche.meses : null,
    recomendado: pequenas >= MIN_DE_DIVIDAS_PEQUENAS ? 'bola-de-neve' : 'avalanche',
  };
}

export function analisarDividas(dividas: readonly Divida[], sobra: Centavos, renda: Centavos): AnaliseDasDividas | null {
  if (dividas.length === 0) return null;
  const extraPorMes = Math.max(0, sobra);
  const comparacao = compararMetodos(dividas, extraPorMes, renda);
  const parcelas = dividas.reduce((s, d) => s + d.parcela, 0);
  const total = dividas.reduce((s, d) => s + d.saldo, 0);
  const apertoGrave = dividas.some((d) => d.emAtraso) || total > APERTO_GRAVE_EM_MESES_DE_RENDA * renda;
  return {
    ...comparacao,
    extraPorMes,
    renegociacao: {
      podePagarPorMes: parcelas + extraPorMes,
      credores: dividas.filter((d) => d.jurosMensal > 0.02 || d.emAtraso).map((d) => ({
        dividaId: d.id, nome: d.nome, trocarRotativo: d.tipo === 'cartao-rotativo' || d.tipo === 'cheque-especial',
      })),
    },
    apertoGrave,
    ajuda: apertoGrave ? AJUDA : [],
  };
}
