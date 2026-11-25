import type { Meta } from '../dominio/meta';
import { calcular, type EntradaDoMotor } from './index';
import { diferencaEmMeses, mesDaData, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import { aporteNecessario } from './metas';
import type { AjustesDoPlano } from './plano';

const LIMITE_DE_MESES = 600;

/** O que o Usuário mexeu no simulador "E se…". */
export interface Cenario {
  /** Meta que está sendo simulada. */
  metaId: string;
  /** Categoria de onde corta (opcional). */
  categoriaId?: string;
  /** Quanto corta por mês dessa Categoria. */
  corte: Centavos;
  /** Quanto guarda a mais por mês. */
  guardarAMais: Centavos;
  /** Novo valor da Meta; sem ele, vale o de hoje. */
  novoCusto?: Centavos;
}

export interface MetaSimulada {
  id: string;
  nome: string;
  custoAntes: Centavos;
  custoDepois: Centavos;
  /** Mês provável de hoje, AAAA-MM; nulo se não chega. */
  dataAntes: string | null;
  dataDepois: string | null;
  /** Positivo: chega antes. Negativo: chega depois. Nulo quando uma das datas não existe. */
  mesesDeDiferenca: number | null;
}

export interface ResultadoDoEse {
  /** Nulo quando a Meta não existe (sem Metas criadas, não há o que simular). */
  meta: MetaSimulada | null;
  /** Aporte mensal da Meta hoje e com o cenário. */
  aporteAntes: Centavos;
  aporteDepois: Centavos;
  /** Categorias de Estilo de vida de onde dá para cortar, com o corte máximo (o Teto atual). */
  cortesPossiveis: { categoriaId: string; maximo: Centavos }[];
}

/** Meses para o valor atual, rendendo e recebendo o Aporte todo mês, chegar no alvo. Nulo se não chega. */
function mesesAteChegar(alvo: Centavos, atual: Centavos, aporte: Centavos, rendimento: number): number | null {
  if (atual >= alvo) return 0;
  let saldo = atual;
  for (let n = 1; n <= LIMITE_DE_MESES; n++) {
    saldo = saldo * (1 + rendimento) + aporte;
    if (saldo >= alvo) return n;
  }
  return null;
}

/**
 * Responde "e se eu cortasse, guardasse a mais ou a Meta custasse outro valor?". O dinheiro a mais vai todo
 * para a Meta escolhida; a data de hoje vem da data-alvo dela (ou do ritmo do Motor, se não tiver data).
 */
export function simularEse(e: EntradaDoMotor, c: Cenario): ResultadoDoEse {
  const base = calcular(e);
  const cortesPossiveis = base.plano.tetos
    .filter((t) => (e.categorias.find((x) => x.id === t.categoriaId)?.grupo ?? 'estilo-de-vida') === 'estilo-de-vida' && t.teto > 0)
    .map((t) => ({ categoriaId: t.categoriaId, maximo: t.teto }));
  const meta = (e.metas ?? []).find((m) => m.id === c.metaId);
  const item = base.metas.escada.find((m) => m.id === c.metaId);
  if (!meta || !item) return { meta: null, aporteAntes: 0, aporteDepois: 0, cortesPossiveis };

  const r = e.parametros.rendimentoMensalConservador;
  const mes = mesDaData(e.hoje);
  const dataAntes = meta.dataAlvo ?? item.dataNoRitmo;
  // Aporte de hoje: o mínimo para a data-alvo; sem data, o que leva até a data no ritmo do Motor.
  const aporteAntes = meta.dataAlvo
    ? item.aporteNecessario ?? item.aporte
    : dataAntes
      ? aporteNecessario(meta.valorAlvo, meta.valorAtual, Math.max(1, diferencaEmMeses(mes, dataAntes) + 1), r)
      : item.aporte;
  const aporteDepois = aporteAntes + Math.max(0, c.corte) + Math.max(0, c.guardarAMais);
  const custoDepois = c.novoCusto ?? meta.valorAlvo;

  const nAntes = mesesAteChegar(meta.valorAlvo, meta.valorAtual, aporteAntes, r);
  const nDepois = mesesAteChegar(custoDepois, meta.valorAtual, aporteDepois, r);
  let dataDepois: string | null = null;
  if (nDepois !== null) {
    dataDepois = dataAntes && nAntes !== null ? somarMeses(dataAntes, nDepois - nAntes) : somarMeses(mes, Math.max(0, nDepois - 1));
    if (dataDepois < mes) dataDepois = mes;
  }
  const mesesDeDiferenca = dataAntes && dataDepois ? diferencaEmMeses(dataDepois, dataAntes) : null;

  return {
    meta: { id: meta.id, nome: meta.nome, custoAntes: meta.valorAlvo, custoDepois, dataAntes, dataDepois, mesesDeDiferenca },
    aporteAntes, aporteDepois, cortesPossiveis,
  };
}

/** "Aplicar ao plano": os Tetos cortados e a Meta com o novo custo e a nova data. Quem chama grava. */
export function aplicarCenario(e: EntradaDoMotor, c: Cenario): { ajustes: AjustesDoPlano; metas: Meta[] } {
  const cortes = { ...(e.ajustesDoPlano?.cortes ?? {}) };
  if (c.categoriaId && c.corte > 0) cortes[c.categoriaId] = (cortes[c.categoriaId] ?? 0) + c.corte;
  const sobrando = Math.max(0, c.corte) + Math.max(0, c.guardarAMais);
  const resultado = simularEse(e, c);
  const metas = (e.metas ?? []).map((m): Meta => {
    if (m.id !== c.metaId) return m;
    const mudouCusto = c.novoCusto !== undefined && c.novoCusto !== m.valorAlvo;
    if (!mudouCusto && sobrando === 0) return m;
    const mudaData = (m.dataAlvo !== undefined || sobrando > 0) && resultado.meta?.dataDepois;
    return { ...m, valorAlvo: c.novoCusto ?? m.valorAlvo, dataAlvo: mudaData ? resultado.meta!.dataDepois! : m.dataAlvo };
  });
  return { ajustes: { cortes }, metas };
}
