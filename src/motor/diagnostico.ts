import type { Categoria, Grupo } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { mesDaData, mesesCompletosEntre, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import type { OcorrenciaDeFixo } from './fixos';
import type { Parametros } from './parametros';

export type Status = 'vermelho' | 'amarelo' | 'verde' | 'azul';

export interface Divisao {
  essencial: number;
  estiloDeVida: number;
  guardar: number;
}

export type TipoDeSinal =
  | 'estilo-de-vida-alto'
  | 'assinaturas-altas'
  | 'muitas-compras-pequenas'
  | 'gasto-acima-do-declarado'
  | 'rotativo';

export interface SinalDeAlerta {
  tipo: TipoDeSinal;
  texto: string;
}

export interface Diagnostico {
  /** Renda usada no Plano (média dos 3 piores meses quando varia). */
  renda: Centavos;
  fixos: Centavos;
  variaveis: Centavos;
  parcelas: Centavos;
  anuaisPorMes: Centavos;
  sobra: Centavos;
  taxaDePoupanca: number;
  custoDeVida: Centavos;
  mesesDeFolego: number;
  mesesDeReservaRecomendados: number;
  reservaRecomendada: Centavos;
  reservaAtual: Centavos;
  /** Fração da renda em cada Grupo neste mês. */
  divisao: Divisao;
  /** Pontos percentuais ideais para cada Grupo. */
  divisaoIdeal: Divisao;
  status: Status;
  mensagem: string;
  sinais: SinalDeAlerta[];
  /** De onde vieram os variáveis: lançamentos do mês anterior ou a estimativa do Onboarding. */
  fonteDosVariaveis: 'lancamentos' | 'estimativa';
  /** Mês usado como referência para os variáveis, AAAA-MM. */
  mesDeReferencia: string;
}

export const MENSAGENS_DO_STATUS: Record<Status, string> = {
  vermelho: 'Antes de qualquer meta: parar o vazamento e tratar a dívida cara.',
  amarelo: 'Você fecha o mês, mas qualquer imprevisto vira dívida.',
  verde: 'Base boa; agora é dar destino ao dinheiro.',
  azul: 'Hora de acelerar metas e investir.',
};

// Regras do motor-financeiro.md (não são Parâmetros de mercado).
const JUROS_QUE_DEIXA_VERMELHO = 0.05;
const COMPRA_PEQUENA: Centavos = 3000;
const LIMITE_DE_COMPRAS_PEQUENAS = 15;

/** Renda fixa usa o valor declarado; renda que varia usa a média dos 3 piores dos últimos 6 meses. */
export function rendaDoPlano(renda: RespostasDoOnboarding['renda']): Centavos {
  if (renda.tipo === 'fixa' || renda.ultimosMeses.length === 0) return renda.valor;
  const piores = [...renda.ultimosMeses.slice(-6)].sort((a, b) => a - b).slice(0, 3);
  return Math.round(piores.reduce((s, v) => s + v, 0) / piores.length);
}

export function mesesDeReserva(respostas: RespostasDoOnboarding): number {
  if (respostas.renda.tipo === 'varia-muito' || respostas.temDependentes) return 12;
  switch (respostas.trabalho) {
    case 'servidor': return 3;
    case 'clt': return 6;
    case 'pj-autonomo':
    case 'empresa-familia': return 9;
    default: return 6;
  }
}

function divisaoIdeal(respostas: RespostasDoOnboarding, renda: Centavos, hoje: string, parametros: Parametros): Divisao {
  // Mora com a família e paga pouca moradia (até 10% da renda): guardar mais, não gastar mais.
  if (respostas.moradia.comQuem === 'familia' && respostas.moradia.valor <= renda * 0.1) {
    return { essencial: 40, estiloDeVida: 20, guardar: 40 };
  }
  // Renda abaixo de 2 salários mínimos: começa em 60-30-10 e sobe 2 pontos por trimestre.
  if (renda < 2 * parametros.salarioMinimo) {
    const trimestres = Math.floor(mesesCompletosEntre(respostas.respondidoEm, hoje) / 3);
    const guardar = Math.min(20, 10 + 2 * trimestres);
    return { essencial: 70 - guardar, estiloDeVida: 30, guardar };
  }
  return { essencial: 50, estiloDeVida: 30, guardar: 20 };
}

export interface EntradaDoDiagnostico {
  hoje: string;
  onboarding: RespostasDoOnboarding;
  /** Fixos do Mês do plano atual. */
  fixosDoMes: OcorrenciaDeFixo[];
  categorias: readonly Categoria[];
  lancamentos: readonly Lancamento[];
  parametros: Parametros;
}

export function diagnosticar(e: EntradaDoDiagnostico): Diagnostico {
  const { onboarding: r } = e;
  const grupoDe = (categoriaId: string): Grupo => e.categorias.find((c) => c.id === categoriaId)?.grupo ?? 'estilo-de-vida';
  const renda = rendaDoPlano(r.renda);

  // Variáveis: os Lançamentos do mês anterior, quando existem; senão, a estimativa do Onboarding.
  const mesDeReferencia = somarMeses(mesDaData(e.hoje), -1);
  const doMesAnterior = e.lancamentos.filter((l) => mesDaData(l.data) === mesDeReferencia);
  const porGrupo: Record<Grupo, Centavos> = { essencial: 0, 'estilo-de-vida': 0, 'guardar-quitar': 0 };
  const fonteDosVariaveis = doMesAnterior.length > 0 ? 'lancamentos' : 'estimativa';
  if (fonteDosVariaveis === 'lancamentos') {
    for (const l of doMesAnterior) porGrupo[grupoDe(l.categoriaId)] += l.valor;
  } else {
    porGrupo.essencial += r.variaveis.essencial;
    porGrupo['estilo-de-vida'] += r.variaveis.estiloDeVida;
  }
  const variaveis = porGrupo.essencial + porGrupo['estilo-de-vida'] + porGrupo['guardar-quitar'];

  const fixosPorGrupo: Record<Grupo, Centavos> = { essencial: 0, 'estilo-de-vida': 0, 'guardar-quitar': 0 };
  for (const f of e.fixosDoMes) fixosPorGrupo[grupoDe(f.categoriaId)] += f.valor;
  const fixos = fixosPorGrupo.essencial + fixosPorGrupo['estilo-de-vida'] + fixosPorGrupo['guardar-quitar'];

  const parcelas = r.dividas.reduce((s, d) => s + d.parcela, 0);
  const anuaisPorMes = Math.round(r.anuais.reduce((s, a) => s + a.valor, 0) / 12);

  const sobra = renda - (fixos + variaveis + parcelas + anuaisPorMes);
  const custoDeVida = fixos + variaveis + parcelas + anuaisPorMes;
  const taxaDePoupanca = renda > 0 ? sobra / renda : 0;
  const reservaAtual = r.guardado.valor;
  const mesesDeFolego = custoDeVida > 0 ? reservaAtual / custoDeVida : reservaAtual > 0 ? Number.POSITIVE_INFINITY : 0;
  const mesesDeReservaRecomendados = mesesDeReserva(r);
  const reservaRecomendada = mesesDeReservaRecomendados * custoDeVida;

  const fracao = (v: Centavos) => (renda > 0 ? v / renda : 0);
  const divisao: Divisao = {
    essencial: fracao(fixosPorGrupo.essencial + porGrupo.essencial + parcelas + anuaisPorMes),
    estiloDeVida: fracao(fixosPorGrupo['estilo-de-vida'] + porGrupo['estilo-de-vida']),
    guardar: fracao(sobra + fixosPorGrupo['guardar-quitar'] + porGrupo['guardar-quitar']),
  };

  const dividaCara = r.dividas.some((d) => d.jurosMensal > JUROS_QUE_DEIXA_VERMELHO);
  const atraso = r.dividas.some((d) => d.emAtraso);
  let status: Status;
  if (sobra < 0 || dividaCara || atraso) status = 'vermelho';
  else if (taxaDePoupanca < 0.1 || mesesDeFolego < 1) status = 'amarelo';
  else if (taxaDePoupanca > 0.3 && reservaAtual >= reservaRecomendada) status = 'azul';
  else status = 'verde';

  // Sinais de alerta
  const sinais: SinalDeAlerta[] = [];
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  if (divisao.estiloDeVida > 0.35) {
    sinais.push({ tipo: 'estilo-de-vida-alto', texto: `Estilo de vida em ${pct(divisao.estiloDeVida)} da renda, acima de 35%.` });
  }
  const assinaturas = doMesAnterior.filter((l) => l.categoriaId === 'assinaturas').reduce((s, l) => s + l.valor, 0)
    + e.fixosDoMes.filter((f) => f.categoriaId === 'assinaturas').reduce((s, f) => s + f.valor, 0);
  if (renda > 0 && assinaturas / renda > 0.08) {
    sinais.push({ tipo: 'assinaturas-altas', texto: `Assinaturas em ${pct(assinaturas / renda)} da renda, acima de 8%.` });
  }
  const pequenas = new Map<string, number>();
  for (const l of doMesAnterior) if (l.valor < COMPRA_PEQUENA) pequenas.set(l.categoriaId, (pequenas.get(l.categoriaId) ?? 0) + 1);
  for (const [categoriaId, n] of pequenas) {
    if (n > LIMITE_DE_COMPRAS_PEQUENAS) {
      const nome = e.categorias.find((c) => c.id === categoriaId)?.nome ?? 'Outros';
      sinais.push({ tipo: 'muitas-compras-pequenas', texto: `${n} compras pequenas em ${nome} no mês.` });
    }
  }
  const declarado = r.variaveis.essencial + r.variaveis.estiloDeVida;
  if (fonteDosVariaveis === 'lancamentos' && declarado > 0 && variaveis > declarado) {
    sinais.push({ tipo: 'gasto-acima-do-declarado', texto: 'O gasto real do mês passou do que você estimou no começo.' });
  }
  if (r.dividas.some((d) => d.tipo === 'cartao-rotativo')) {
    sinais.push({ tipo: 'rotativo', texto: 'Rotativo do cartão em uso: é o juro mais caro que existe.' });
  }

  return {
    renda, fixos, variaveis, parcelas, anuaisPorMes, sobra, taxaDePoupanca, custoDeVida, mesesDeFolego,
    mesesDeReservaRecomendados, reservaRecomendada, reservaAtual, divisao, divisaoIdeal: divisaoIdeal(r, renda, e.hoje, e.parametros),
    status, mensagem: MENSAGENS_DO_STATUS[status], sinais, fonteDosVariaveis, mesDeReferencia,
  };
}
