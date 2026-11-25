import { dataNoMes, mesDaData, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import { calcular, type EntradaDoMotor } from './index';
import type { Plano } from './plano';

export interface PlacarDoMes {
  /** AAAA-MM do mês que está sendo fechado. */
  mes: string;
  proximoMes: string;
  /** Primeiro mês com dados: conta como Mês do plano 0, sem Tetos. */
  mesZero: boolean;
  categoriasNoTeto: number;
  totalDeCategorias: number;
  /** Soma do que ficou abaixo do Teto nas Categorias. */
  dinheiroSalvo: Centavos;
  estouradas: { categoriaId: string; excesso: Centavos }[];
  /** Quanto o mês passou do limite de gastos; 0 quando ficou dentro. */
  excesso: Centavos;
  /** Quanto o excesso adia a Meta mais próxima (estimativa em dias). Nulo quando não há excesso nem Meta. */
  impactoNasMetas: { metaNome: string; diasDeAtraso: number } | null;
  /** O que acontece se o dinheiro salvo virar Aporte de uma Meta criada pelo Usuário. */
  aporteExtra: { metaId: string; metaNome: string; valor: Centavos; semanasAntes: number } | null;
  /** O Plano do mês seguinte, já com o que aconteceu neste mês na média dos Tetos. */
  proximoPlano: Plano;
}

const DIAS_NO_MES = 30;
const SEMANAS_NO_MES = 4.345;

function mesesEntre(de: string | null, ate: string | null): number {
  if (!de || !ate) return 0;
  const [a1, m1] = de.split('-').map(Number) as [number, number];
  const [a2, m2] = ate.split('-').map(Number) as [number, number];
  return (a2 - a1) * 12 + (m2 - m1);
}

/** Fecha o mês: placar, dinheiro salvo, impacto nas Metas e o Plano do mês seguinte. Só usa o Motor. */
export function fecharMes(e: EntradaDoMotor, mes: string): PlacarDoMes {
  const proximoMes = somarMeses(mes, 1);
  const noFim = calcular({ ...e, hoje: dataNoMes(mes, 31) });
  const proximo = calcular({ ...e, hoje: dataNoMes(proximoMes, 1) });
  const plano = noFim.plano;

  const estouradas = plano.tetos.filter((t) => t.estado === 'estourado').map((t) => ({ categoriaId: t.categoriaId, excesso: t.gasto - t.teto }));
  const dinheiroSalvo = plano.tetos.reduce((s, t) => s + Math.max(0, t.teto - t.gasto), 0);
  const excesso = Math.max(0, plano.gastoDoMes - plano.limiteDoMes);

  const proximaMeta = noFim.metas.escada.find((m) => !m.feita && m.aporte > 0);
  const perdido = Math.min(excesso, plano.guardarPorMes);
  const diasDeAtraso = plano.guardarPorMes > 0 ? Math.round((perdido / plano.guardarPorMes) * DIAS_NO_MES) : 0;
  const impactoNasMetas = proximaMeta && diasDeAtraso > 0 ? { metaNome: proximaMeta.nome, diasDeAtraso } : null;

  // Só Metas criadas pelo Usuário guardam o valor: as montadas pelo Motor (Colchão, Reserva) não recebem Aporte avulso.
  const metaDoUsuario = (e.metas ?? []).find((m) => m.valorAtual < m.valorAlvo);
  let aporteExtra: PlacarDoMes['aporteExtra'] = null;
  if (metaDoUsuario && dinheiroSalvo > 0) {
    const antes = noFim.metas.escada.find((m) => m.id === metaDoUsuario.id);
    const depois = calcular({
      ...e, hoje: dataNoMes(mes, 31),
      metas: (e.metas ?? []).map((m) => (m.id === metaDoUsuario.id ? { ...m, valorAtual: m.valorAtual + dinheiroSalvo } : m)),
    }).metas.escada.find((m) => m.id === metaDoUsuario.id);
    const meses = mesesEntre(depois?.dataNoRitmo ?? null, antes?.dataNoRitmo ?? null);
    aporteExtra = { metaId: metaDoUsuario.id, metaNome: metaDoUsuario.nome, valor: dinheiroSalvo, semanasAntes: Math.max(0, Math.round(meses * SEMANAS_NO_MES)) };
  }

  return {
    mes, proximoMes, mesZero: plano.mesSemTetos,
    categoriasNoTeto: plano.tetos.length - estouradas.length, totalDeCategorias: plano.tetos.length,
    dinheiroSalvo, estouradas, excesso, impactoNasMetas, aporteExtra, proximoPlano: proximo.plano,
  };
}

/** Mês anterior ao de hoje: o que o Fechamento mensal fecha. */
export function mesParaFechar(hoje: string): string {
  return somarMeses(mesDaData(hoje), -1);
}
