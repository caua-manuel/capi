import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { dataNoMes, diasNoMes, diferencaEmDias, mesDaData, mesesCompletosEntre, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import type { PlanoDasMetas } from './metas';
import type { Plano } from './plano';
import type { Recorrente } from './recorrentes';

/** Um Aviso já mostrado, para respeitar o limite de 3 por semana. */
export interface AvisoMostrado {
  chave: string;
  /** Dia em que apareceu, AAAA-MM-DD. */
  data: string;
}

type Base = { chave: string; prioridade: number };
export type Aviso = Base & (
  | { tipo: 'teto-estourado'; categoriaId: string; excesso: Centavos }
  | { tipo: 'teto-80'; categoriaId: string; gasto: Centavos; teto: Centavos; diasRestantes: number }
  | { tipo: 'ritmo-diario'; porDia: Centavos }
  | { tipo: 'assinatura-chegando'; loja: string; valor: Centavos; data: string }
  | { tipo: 'anual-chegando'; nome: string; valor: Centavos; data: string; caixinha: Centavos }
  | { tipo: 'meta-perto'; metaId: string; nome: string; marco: number; falta: Centavos }
  | { tipo: 'sumiu'; aindaPodeGastar: Centavos }
);

// Regras do motor-financeiro.md, "Avisos (no máximo 3 por semana)".
const LIMITE_POR_SEMANA = 3;
const DIAS_DA_SEMANA = 7;
const TETO_80 = 0.8;
const DIA_LIMITE_DO_TETO_80 = 20;
const DIAS_ANTES_DA_ASSINATURA = 2;
const DIAS_ANTES_DO_ANUAL = 30;
const MARCOS = [25, 50, 75, 90];
const DIAS_PARA_SUMIU = 7;

export interface EntradaDosAvisos {
  hoje: string;
  onboarding: RespostasDoOnboarding;
  plano: Plano;
  metas: PlanoDasMetas;
  recorrentes: readonly Recorrente[];
  avisosMostrados: readonly AvisoMostrado[];
  ultimaAbertura?: string;
}

function candidatos(e: EntradaDosAvisos): Aviso[] {
  const mes = mesDaData(e.hoje);
  const dia = Number(e.hoje.slice(8, 10));
  const lista: Aviso[] = [];

  for (const t of [...e.plano.tetos].sort((a, b) => b.uso - a.uso)) {
    if (t.estado === 'estourado') {
      lista.push({ tipo: 'teto-estourado', prioridade: 1, chave: `teto-estourado:${t.categoriaId}:${mes}`, categoriaId: t.categoriaId, excesso: t.gasto - t.teto });
    } else if (t.uso >= TETO_80 && dia < DIA_LIMITE_DO_TETO_80) {
      lista.push({
        tipo: 'teto-80', prioridade: 2, chave: `teto-80:${t.categoriaId}:${mes}`, categoriaId: t.categoriaId,
        gasto: t.gasto, teto: t.teto, diasRestantes: e.plano.diasRestantes,
      });
    }
  }

  const linhaIdeal = (e.plano.limiteDoMes * dia) / diasNoMes(mes);
  if (e.plano.limiteDoMes > 0 && e.plano.gastoDoMes > linhaIdeal) {
    lista.push({ tipo: 'ritmo-diario', prioridade: 3, chave: `ritmo:${mes}`, porDia: e.plano.porDia });
  }

  for (const r of e.recorrentes) {
    const data = [mes, somarMeses(mes, 1)].map((m) => dataNoMes(m, r.dia)).find((d) => d > e.hoje);
    if (!data) continue;
    const faltam = diferencaEmDias(e.hoje, data);
    if (faltam >= 1 && faltam <= DIAS_ANTES_DA_ASSINATURA) {
      lista.push({ tipo: 'assinatura-chegando', prioridade: 4, chave: `assinatura:${r.chave}:${data}`, loja: r.loja, valor: r.valor, data });
    }
  }

  const mesesDesdeOnboarding = mesesCompletosEntre(e.onboarding.respondidoEm, e.hoje);
  for (const a of e.onboarding.anuais) {
    const ano = Number(e.hoje.slice(0, 4));
    const data = [ano, ano + 1].map((y) => `${y}-${String(a.mes).padStart(2, '0')}-01`).find((d) => d >= e.hoje);
    if (!data) continue;
    if (diferencaEmDias(e.hoje, data) <= DIAS_ANTES_DO_ANUAL) {
      const caixinha = Math.min(a.valor, Math.round((a.valor / 12) * mesesDesdeOnboarding));
      lista.push({ tipo: 'anual-chegando', prioridade: 5, chave: `anual:${a.id}:${data}`, nome: a.nome, valor: a.valor, data, caixinha });
    }
  }

  for (const m of e.metas.escada) {
    if (m.feita) continue;
    const marco = [...MARCOS].reverse().find((x) => m.progresso * 100 >= x);
    if (marco) lista.push({ tipo: 'meta-perto', prioridade: 6, chave: `meta:${m.id}:${marco}`, metaId: m.id, nome: m.nome, marco, falta: m.alvo - m.atual });
  }

  if (e.ultimaAbertura && diferencaEmDias(e.ultimaAbertura, e.hoje) >= DIAS_PARA_SUMIU) {
    lista.push({ tipo: 'sumiu', prioridade: 7, chave: `sumiu:${e.hoje}`, aindaPodeGastar: e.plano.aindaPodeGastar });
  }
  return lista.sort((a, b) => a.prioridade - b.prioridade);
}

/** Os Avisos do momento: por prioridade, no máximo 3 novos por semana; os já mostrados na semana continuam. */
export function escolherAvisos(e: EntradaDosAvisos): Aviso[] {
  const daSemana = e.avisosMostrados.filter((a) => {
    const dias = diferencaEmDias(a.data, e.hoje);
    return dias >= 0 && dias < DIAS_DA_SEMANA;
  });
  const jaMostradas = new Set(daSemana.map((a) => a.chave));
  let novosPermitidos = Math.max(0, LIMITE_POR_SEMANA - daSemana.length);
  const escolhidos: Aviso[] = [];
  for (const a of candidatos(e)) {
    if (jaMostradas.has(a.chave)) escolhidos.push(a);
    else if (novosPermitidos > 0) { escolhidos.push(a); novosPermitidos--; }
  }
  return escolhidos;
}
