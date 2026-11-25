import type { Categoria } from '../dominio/categorias';
import type { Meta } from '../dominio/meta';
import type { Divida } from '../dominio/onboarding';
import { diferencaEmMeses, mesDaData, somarMeses } from './datas';
import type { Diagnostico } from './diagnostico';
import type { Centavos } from './dinheiro';
import type { Plano } from './plano';

// Regras da escada (motor-financeiro.md, "Planos de metas").
const JUROS_DE_DIVIDA_CARA = 0.02;
const META_SIMPLES_ATE_MESES = 12;
const LIMITE_DE_MESES = 600;
const MARGEM_DA_VIAGEM = 0.15;
const TAXA_DE_RETIRADA = 0.04;

export type Degrau = 1 | 2 | 3 | 4 | 5;

export interface MetaNaEscada {
  id: string;
  nome: string;
  degrau: Degrau;
  alvo: Centavos;
  atual: Centavos;
  progresso: number;
  feita: boolean;
  /** Quanto vai para ela neste mês. */
  aporte: Centavos;
  /** Só metas com data: o Aporte mínimo para chegar na data. */
  aporteNecessario?: Centavos;
  dataAlvo?: string;
  /** Mês provável no ritmo de hoje, AAAA-MM; nulo se não chega em 50 anos. */
  dataNoRitmo: string | null;
  dataComCortes: string | null;
  /** Só longo prazo: quanto por mês para chegar em 3, 5 e 8 anos. */
  aportePorPrazo?: { tresAnos: Centavos; cincoAnos: Centavos; oitoAnos: Centavos };
  internacional?: boolean;
}

export type TipoDeSaida = 'adiar' | 'reduzir' | 'cortar';

export interface SaidaQuandoNaoCabe {
  tipo: TipoDeSaida;
  texto: string;
  metaId?: string;
  novaData?: string;
  novoValor?: Centavos;
  valor?: Centavos;
}

export interface PlanoDasMetas {
  escada: MetaNaEscada[];
  /** O que sobra por mês hoje para Metas e Dívidas. */
  disponivel: Centavos;
  /** Soma dos Aportes mínimos das metas com data. */
  necessario: Centavos;
  aporteTotal: Centavos;
  naoCabe: boolean;
  saidas: SaidaQuandoNaoCabe[];
  /** Quanto os cortes sugeridos liberam por mês. */
  cortesSugeridos: Centavos;
}

/**
 * Aporte mensal para chegar em `alvo` em `n` meses, já tendo `atual`.
 * Até 12 meses: sem rendimento. Acima: PMT = (Meta − VA(1+r)^n) r / ((1+r)^n − 1).
 */
export function aporteNecessario(alvo: Centavos, atual: Centavos, n: number, r: number): Centavos {
  const falta = alvo - atual;
  if (falta <= 0) return 0;
  if (n <= 1) return falta;
  if (n <= META_SIMPLES_ATE_MESES || r <= 0) return Math.ceil(falta / n);
  const fator = (1 + r) ** n;
  return Math.max(0, Math.ceil(((alvo - atual * fator) * r) / (fator - 1)));
}

// Perguntas extras de cada objetivo
export function metaDeViagem({ custo }: { custo: Centavos }) {
  return { valorAlvo: Math.round(custo * (1 + MARGEM_DA_VIAGEM)) };
}

export function metaDeAposentadoria({ rendaDesejada }: { rendaDesejada: Centavos }) {
  return { valorAlvo: Math.round((rendaDesejada * 12) / TAXA_DE_RETIRADA) };
}

export function compararCompra({ preco, parcelas, valorDaParcela }: { preco: Centavos; parcelas: number; valorDaParcela: Centavos }) {
  const totalParcelado = parcelas * valorDaParcela;
  return { totalParcelado, jurosTotais: Math.max(0, totalParcelado - preco) };
}

export function testeDeMorarSozinho({ custoMensalNovo, renda }: { custoMensalNovo: Centavos; renda: Centavos }) {
  const limite = Math.round(renda * 0.5);
  return { cabe: custoMensalNovo <= limite, limite };
}

export interface EntradaDasMetas {
  hoje: string;
  metas: readonly Meta[];
  dividas: readonly Divida[];
  diagnostico: Diagnostico;
  plano: Plano;
  categorias: readonly Categoria[];
  rendimentoMensal: number;
  /** Quanto a pessoa já guarda por mês (pergunta 11): vira o ritmo da data "no seu ritmo". */
  guardaPorMes?: Centavos;
  /** Compra simulada no "Posso comprar?": sai do dinheiro dos primeiros meses. */
  compra?: { valor: Centavos; parcelas: number };
}

interface Simulacao {
  aporte: Map<string, Centavos>;
  concluiEm: Map<string, number>;
}

/** Simula mês a mês para onde vai o dinheiro, seguindo a escada. */
function simular(e: EntradaDasMetas, disponivel: Centavos, pmts: Map<string, Centavos>): Simulacao {
  const r = e.rendimentoMensal;
  const d = e.diagnostico;
  const caras = e.dividas.filter((x) => x.jurosMensal > JUROS_DE_DIVIDA_CARA);
  let divida = caras.reduce((s, x) => s + x.saldo, 0);
  const jurosDaDivida = divida > 0 ? caras.reduce((s, x) => s + x.saldo * x.jurosMensal, 0) / divida : 0;
  const parcelasCaras = caras.reduce((s, x) => s + x.parcela, 0);
  const colchao = d.custoDeVida;
  const reserva = d.reservaRecomendada;
  let guardado = d.reservaAtual;
  const comData = e.metas.filter((m) => m.dataAlvo).sort((a, b) => a.prioridade - b.prioridade || a.dataAlvo!.localeCompare(b.dataAlvo!));
  const semData = e.metas.filter((m) => !m.dataAlvo).sort((a, b) => a.prioridade - b.prioridade);
  const saldo = new Map(e.metas.map((m) => [m.id, m.valorAtual]));
  const aporte = new Map<string, Centavos>();
  const concluiEm = new Map<string, number>();
  let livre = disponivel;
  // A compra simulada entra antes das Metas; o que não couber num mês passa para o seguinte.
  let compraPendente = 0;
  const parcelaDaCompra = (mes: number): Centavos => {
    const c = e.compra;
    if (!c) return 0;
    if (c.parcelas <= 1) return mes === 1 ? c.valor : 0;
    if (mes > c.parcelas) return 0;
    const base = Math.floor(c.valor / c.parcelas);
    return mes === 1 ? c.valor - base * (c.parcelas - 1) : base;
  };

  const concluir = (id: string, mes: number) => { if (!concluiEm.has(id)) concluiEm.set(id, mes); };
  const verificar = (mes: number) => {
    if (guardado >= colchao) concluir('colchao', mes);
    if (guardado >= reserva) concluir('reserva', mes);
    if (caras.length > 0 && divida <= 0) concluir('divida-cara', mes);
    for (const m of e.metas) if ((saldo.get(m.id) ?? 0) >= m.valorAlvo) concluir(m.id, mes);
  };
  verificar(0);

  for (let mes = 1; mes <= LIMITE_DE_MESES; mes++) {
    guardado *= 1 + r;
    for (const [id, v] of saldo) saldo.set(id, v * (1 + r));
    if (divida > 0) {
      divida = divida * (1 + jurosDaDivida) - parcelasCaras;
      // Dívida quitada: a parcela dela vira dinheiro livre (efeito bola de neve).
      if (divida <= 0) { divida = 0; livre += parcelasCaras; }
    }
    compraPendente += parcelaDaCompra(mes);
    const paraACompra = Math.min(compraPendente, livre);
    compraPendente -= paraACompra;
    let disponivelNoMes = livre - paraACompra;
    const dar = (id: string, valor: number) => {
      if (valor <= 0) return;
      disponivelNoMes -= valor;
      if (mes === 1) aporte.set(id, (aporte.get(id) ?? 0) + valor);
    };
    for (const m of comData) {
      if (concluiEm.has(m.id)) continue;
      const v = Math.min(pmts.get(m.id) ?? 0, disponivelNoMes, m.valorAlvo - (saldo.get(m.id) ?? 0));
      saldo.set(m.id, (saldo.get(m.id) ?? 0) + Math.max(0, v));
      dar(m.id, v);
    }
    // O resto desce para o degrau de baixo e vai subindo.
    while (disponivelNoMes > 0.5) {
      if (guardado < colchao) {
        const v = Math.min(disponivelNoMes, colchao - guardado); guardado += v; dar('colchao', v);
      } else if (divida > 0) {
        const v = Math.min(disponivelNoMes, divida); divida -= v; dar('divida-cara', v);
        if (divida <= 0) livre += parcelasCaras;
      } else if (guardado < reserva) {
        const v = Math.min(disponivelNoMes, reserva - guardado); guardado += v; dar('reserva', v);
      } else {
        const proxima = [...comData, ...semData].find((m) => (saldo.get(m.id) ?? 0) < m.valorAlvo);
        if (!proxima) break;
        const v = Math.min(disponivelNoMes, proxima.valorAlvo - (saldo.get(proxima.id) ?? 0));
        saldo.set(proxima.id, (saldo.get(proxima.id) ?? 0) + v);
        dar(proxima.id, v);
      }
      verificar(mes);
    }
    verificar(mes);
    const todas = ['colchao', 'reserva', ...(caras.length ? ['divida-cara'] : []), ...e.metas.map((m) => m.id)];
    if (todas.every((id) => concluiEm.has(id))) break;
  }
  return { aporte, concluiEm };
}

export function planejarMetas(e: EntradaDasMetas): PlanoDasMetas {
  const mes = mesDaData(e.hoje);
  const d = e.diagnostico;
  const r = e.rendimentoMensal;
  const disponivel = Math.max(0, d.sobra);
  const grupoDe = (id: string) => e.categorias.find((c) => c.id === id)?.grupo ?? 'estilo-de-vida';

  // Cortes sugeridos: o que passa dos Tetos de Estilo de vida; sem Tetos, o que passa do ideal do Grupo.
  const cortesSugeridos = e.plano.tetos.length > 0
    ? e.plano.tetos.filter((t) => grupoDe(t.categoriaId) === 'estilo-de-vida').reduce((s, t) => s + Math.max(0, t.media - t.teto), 0)
    : Math.max(0, Math.round((d.divisao.estiloDeVida - d.divisaoIdeal.estiloDeVida / 100) * d.renda));

  const mesesAte = (dataAlvo: string) => diferencaEmMeses(mes, dataAlvo);
  const pmts = new Map<string, Centavos>();
  for (const m of e.metas) if (m.dataAlvo) pmts.set(m.id, aporteNecessario(m.valorAlvo, m.valorAtual, mesesAte(m.dataAlvo), r));

  // O Aporte do mês vem da Sobra distribuída pela escada. A data "no seu ritmo" usa o que a pessoa
  // já guarda por mês, quando ela informou; sem isso, o ritmo é a própria Sobra.
  const ritmoAtual = e.guardaPorMes && e.guardaPorMes > 0 ? e.guardaPorMes : disponivel;
  const planejado = simular(e, disponivel, pmts);
  const noRitmo = ritmoAtual === disponivel ? planejado : simular(e, ritmoAtual, pmts);
  const comCortes = simular(e, ritmoAtual + cortesSugeridos, pmts);
  const data = (s: Simulacao, id: string) => {
    const k = s.concluiEm.get(id);
    return k === undefined ? null : somarMeses(mes, Math.max(0, k - 1));
  };

  const escada: MetaNaEscada[] = [];
  const item = (id: string, nome: string, degrau: Degrau, alvo: Centavos, atual: Centavos, extra: Partial<MetaNaEscada> = {}): MetaNaEscada => ({
    id, nome, degrau, alvo, atual, progresso: alvo > 0 ? Math.min(1, atual / alvo) : 1, feita: atual >= alvo,
    aporte: Math.round(planejado.aporte.get(id) ?? 0), dataNoRitmo: data(noRitmo, id), dataComCortes: data(comCortes, id), ...extra,
  });

  escada.push(item('colchao', 'Colchão de 1 mês', 1, d.custoDeVida, Math.min(d.reservaAtual, d.custoDeVida)));
  const caras = e.dividas.filter((x) => x.jurosMensal > JUROS_DE_DIVIDA_CARA);
  if (caras.length > 0) escada.push(item('divida-cara', 'Dívida cara', 2, caras.reduce((s, x) => s + x.saldo, 0), 0));
  escada.push(item('reserva', `Reserva de ${d.mesesDeReservaRecomendados} meses`, 3, d.reservaRecomendada, d.reservaAtual));
  const comData = e.metas.filter((m) => m.dataAlvo).sort((a, b) => a.prioridade - b.prioridade || a.dataAlvo!.localeCompare(b.dataAlvo!));
  for (const m of comData) {
    escada.push(item(m.id, m.nome, 4, m.valorAlvo, m.valorAtual, {
      dataAlvo: m.dataAlvo, aporteNecessario: pmts.get(m.id), internacional: m.internacional,
    }));
  }
  for (const m of e.metas.filter((x) => !x.dataAlvo).sort((a, b) => a.prioridade - b.prioridade)) {
    escada.push(item(m.id, m.nome, 5, m.valorAlvo, m.valorAtual, {
      aportePorPrazo: {
        tresAnos: aporteNecessario(m.valorAlvo, m.valorAtual, 36, r),
        cincoAnos: aporteNecessario(m.valorAlvo, m.valorAtual, 60, r),
        oitoAnos: aporteNecessario(m.valorAlvo, m.valorAtual, 96, r),
      },
    }));
  }

  const pendentesComData = comData.filter((m) => m.valorAtual < m.valorAlvo);
  const necessario = pendentesComData.reduce((s, m) => s + (pmts.get(m.id) ?? 0), 0);
  const naoCabe = necessario > disponivel;
  const saidas: SaidaQuandoNaoCabe[] = [];
  if (naoCabe) {
    // Da menor prioridade para a maior. Colchão e Reserva nunca entram aqui.
    const porPrioridade = [...pendentesComData].sort((a, b) => b.prioridade - a.prioridade || b.dataAlvo!.localeCompare(a.dataAlvo!));
    const sobraSem = (m: Meta) => disponivel - (necessario - (pmts.get(m.id) ?? 0));

    const aAdiar = porPrioridade[0]!;
    const livre = sobraSem(aAdiar);
    let n = Math.max(1, mesesAte(aAdiar.dataAlvo!));
    if (livre > 0) {
      while (n < LIMITE_DE_MESES && aporteNecessario(aAdiar.valorAlvo, aAdiar.valorAtual, n, r) > livre) n++;
    } else {
      // Só cabe depois que as outras metas com data terminarem.
      const fimDasOutras = Math.max(...pendentesComData.filter((m) => m !== aAdiar).map((m) => mesesAte(m.dataAlvo!)), 0);
      n = fimDasOutras + Math.ceil((aAdiar.valorAlvo - aAdiar.valorAtual) / Math.max(1, disponivel));
    }
    const novaData = somarMeses(mes, Math.min(n, LIMITE_DE_MESES));
    saidas.push({ tipo: 'adiar', metaId: aAdiar.id, novaData, texto: `Adiar ${aAdiar.nome}.` });

    const aReduzir = porPrioridade.find((m) => sobraSem(m) > 0) ?? porPrioridade[porPrioridade.length - 1]!;
    const livreParaReduzir = Math.max(0, sobraSem(aReduzir)) || disponivel;
    const novoValor = Math.min(aReduzir.valorAlvo, aReduzir.valorAtual + livreParaReduzir * Math.max(1, mesesAte(aReduzir.dataAlvo!)));
    saidas.push({ tipo: 'reduzir', metaId: aReduzir.id, novoValor, texto: `Reduzir ${aReduzir.nome} para caber no mês.` });

    saidas.push({ tipo: 'cortar', valor: cortesSugeridos, texto: 'Liberar dinheiro cortando o que passa dos Tetos de Estilo de vida.' });
  }

  const aporteTotal = escada.reduce((s, m) => s + m.aporte, 0);
  return { escada, disponivel, necessario, aporteTotal, naoCabe, saidas, cortesSugeridos };
}
