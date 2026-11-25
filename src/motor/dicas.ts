import type { Fatura } from '../dominio/fatura';
import type { Lancamento } from '../dominio/lancamento';
import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { diferencaEmMeses, mesDaData, somarMeses } from './datas';
import type { Diagnostico } from './diagnostico';
import type { Centavos } from './dinheiro';
import type { PlanoDasMetas } from './metas';
import type { Parametros } from './parametros';
import type { Plano } from './plano';
import type { Recorrente } from './recorrentes';

export type TipoDeDica =
  | 'comida-fora' | 'compras-pequenas' | 'servicos-parecidos' | 'assinatura-dolar' | 'assinatura-duplicada'
  | 'combustivel' | 'dinheiro-parado' | 'fatura-crescendo' | 'rotativo' | 'caixinha';

export interface Dica {
  tipo: TipoDeDica;
  /** Economia estimada por mês. */
  economiaPorMes: Centavos;
  /** A Meta que anda mais rápido com essa economia (a primeira não feita da escada). */
  metaId?: string;
  metaNome?: string;
  /** Quantos meses antes essa Meta chega com a economia; nulo se não dá para calcular. */
  mesesAntes: number | null;
  /** Só fatura crescendo: o teto sugerido para o próximo mês. */
  tetoSugerido?: Centavos;
}

// Gatilhos do motor-financeiro.md, "Dicas úteis por situação".
const COMIDA_FORA_DA_RENDA = 0.15;
const PEDIDOS_POR_MES = 12;
const CORTE_DE_COMIDA_FORA = 0.3;
const COMPRA_PEQUENA: Centavos = 3000;
const LIMITE_DE_COMPRAS_PEQUENAS = 10;
const ECONOMIA_DAS_COMPRAS_PEQUENAS = { minimo: 10000, maximo: 30000 };
const ECONOMIA_EM_DOLAR = 0.15;
const ECONOMIA_DE_COMBUSTIVEL = 0.07;
const ABASTECIMENTOS_PEQUENOS = 4;
const REDUCAO_DA_FATURA = 0.1;

export interface EntradaDasDicas {
  hoje: string;
  onboarding: RespostasDoOnboarding;
  diagnostico: Diagnostico;
  plano: Plano;
  metas: PlanoDasMetas;
  recorrentes: readonly Recorrente[];
  lancamentos: readonly Lancamento[];
  faturas: readonly Fatura[];
  parametros: Parametros;
  /** O plano das Metas se a Sobra fosse maior: para mostrar o efeito na data. */
  metasComExtra: (extra: Centavos) => PlanoDasMetas;
}

export function gerarDicas(e: EntradaDasDicas): Dica[] {
  const mesPassado = somarMeses(mesDaData(e.hoje), -1);
  const doMesPassado = e.lancamentos.filter((l) => mesDaData(l.data) === mesPassado);
  const renda = e.diagnostico.renda;
  const brutas: { tipo: TipoDeDica; economiaPorMes: Centavos; tetoSugerido?: Centavos }[] = [];
  const media = (id: string) => e.plano.tetos.find((t) => t.categoriaId === id)?.media ?? 0;

  const comidaFora = media('delivery') + media('comida-fora');
  const pedidos = doMesPassado.filter((l) => l.categoriaId === 'delivery' || l.categoriaId === 'comida-fora').length;
  if ((renda > 0 && comidaFora > COMIDA_FORA_DA_RENDA * renda) || pedidos > PEDIDOS_POR_MES) {
    brutas.push({ tipo: 'comida-fora', economiaPorMes: Math.round(comidaFora * CORTE_DE_COMIDA_FORA) });
  }

  const pequenas = doMesPassado.filter((l) => l.valor < COMPRA_PEQUENA);
  if (pequenas.length > LIMITE_DE_COMPRAS_PEQUENAS) {
    const metade = Math.round(pequenas.reduce((s, l) => s + l.valor, 0) / 2);
    brutas.push({ tipo: 'compras-pequenas', economiaPorMes: Math.min(ECONOMIA_DAS_COMPRAS_PEQUENAS.maximo, Math.max(ECONOMIA_DAS_COMPRAS_PEQUENAS.minimo, metade)) });
  }

  const assinaturas = e.recorrentes.filter((r) => (r.categoriaId ?? 'assinaturas') === 'assinaturas');
  if (assinaturas.length >= 2) brutas.push({ tipo: 'servicos-parecidos', economiaPorMes: Math.min(...assinaturas.map((r) => r.valor)) });
  const emDolar = e.recorrentes.filter((r) => r.emDolar);
  if (emDolar.length > 0) brutas.push({ tipo: 'assinatura-dolar', economiaPorMes: Math.round(emDolar.reduce((s, r) => s + r.valor, 0) * ECONOMIA_EM_DOLAR) });
  const duplicadas = e.recorrentes.filter((r) => r.duplicada);
  if (duplicadas.length > 0) brutas.push({ tipo: 'assinatura-duplicada', economiaPorMes: duplicadas.reduce((s, r) => s + r.valor, 0) });

  const abastecimentos = doMesPassado.filter((l) => l.categoriaId === 'combustivel' && l.valor >= 4500 && l.valor <= 5500);
  if (abastecimentos.length >= ABASTECIMENTOS_PEQUENOS) {
    const combustivel = doMesPassado.filter((l) => l.categoriaId === 'combustivel').reduce((s, l) => s + l.valor, 0);
    brutas.push({ tipo: 'combustivel', economiaPorMes: Math.round(combustivel * ECONOMIA_DE_COMBUSTIVEL) });
  }

  const { guardado } = e.onboarding;
  if (guardado.valor > 0 && (guardado.onde === 'conta' || guardado.onde === 'poupanca')) {
    const rendeHoje = guardado.onde === 'poupanca' ? e.parametros.poupancaMensal : 0;
    brutas.push({ tipo: 'dinheiro-parado', economiaPorMes: Math.round(guardado.valor * (e.parametros.rendimentoMensalConservador - rendeHoje)) });
  }

  const totais = [...e.faturas].sort((a, b) => a.fechamento.localeCompare(b.fechamento))
    .map((f) => f.linhas.filter((l) => l.tipo === 'compra').reduce((s, l) => s + l.valor, 0)).slice(-3);
  if (totais.length === 3 && totais[0]! < totais[1]! && totais[1]! < totais[2]!) {
    const tetoSugerido = Math.round(((totais[0]! + totais[1]! + totais[2]!) / 3) * (1 - REDUCAO_DA_FATURA));
    brutas.push({ tipo: 'fatura-crescendo', economiaPorMes: Math.max(0, totais[2]! - tetoSugerido), tetoSugerido });
  }

  const rotativos = e.onboarding.dividas.filter((d) => d.tipo === 'cartao-rotativo' || d.tipo === 'cheque-especial');
  if (rotativos.length > 0) brutas.push({ tipo: 'rotativo', economiaPorMes: Math.round(rotativos.reduce((s, d) => s + d.saldo * d.jurosMensal, 0)) });

  const anuais = e.onboarding.anuais.reduce((s, a) => s + a.valor, 0);
  if (anuais > 0) brutas.push({ tipo: 'caixinha', economiaPorMes: Math.round(anuais / 12) });

  // Efeito na data: a primeira Meta ainda não feita, com e sem a economia.
  const alvo = e.metas.escada.find((m) => !m.feita);
  return brutas.map((b) => {
    if (!alvo || b.economiaPorMes <= 0 || b.tipo === 'caixinha') return { ...b, mesesAntes: null };
    const depois = e.metasComExtra(b.economiaPorMes).escada.find((m) => m.id === alvo.id);
    const mesesAntes = alvo.dataNoRitmo && depois?.dataNoRitmo ? Math.max(0, diferencaEmMeses(depois.dataNoRitmo, alvo.dataNoRitmo)) : null;
    return { ...b, metaId: alvo.id, metaNome: alvo.nome, mesesAntes };
  });
}
