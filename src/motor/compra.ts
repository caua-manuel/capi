import { diferencaEmMeses } from './datas';
import type { Centavos } from './dinheiro';
import { calcular, type EntradaDoMotor } from './index';

export interface Compra {
  preco: Centavos;
  /** 1 = à vista. */
  parcelas: number;
  categoriaId: string;
}

export type Veredito = 'cabe' | 'aperta' | 'nao-cabe';

export interface RespostaDaCompra {
  /** O que pesa neste mês: o preço à vista ou a primeira parcela. */
  valorNoMes: Centavos;
  parcelasFuturas: { quantidade: number; valor: Centavos } | null;
  /** Nulo quando a Categoria não tem Teto neste mês. */
  teto: { restanteAntes: Centavos; restanteDepois: Centavos; cabe: boolean } | null;
  limite: { aindaAntes: Centavos; aindaDepois: Centavos; cabe: boolean };
  /** Nulo sem as datas do cartão. */
  previsao: { antes: Centavos; depois: Centavos } | null;
  metas: { id: string; nome: string; dataAntes: string | null; dataDepois: string | null; mesesDeAtraso: number | null }[];
  veredito: Veredito;
}

/** Uma compra guardada pela regra das 24 horas. */
export interface CompraEmEspera extends Compra {
  id: string;
  descricao: string;
  /** Momento em que foi guardada, ISO. */
  guardadaEm: string;
}

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

function parcelaDoMes(c: Compra): { primeira: Centavos; demais: Centavos } {
  if (c.parcelas <= 1) return { primeira: c.preco, demais: 0 };
  const demais = Math.floor(c.preco / c.parcelas);
  return { primeira: c.preco - demais * (c.parcelas - 1), demais };
}

/** "Posso comprar?": o impacto no Teto, no limite do mês, na Previsão de fatura e na data das Metas. */
export function avaliarCompra(entrada: EntradaDoMotor, compra: Compra): RespostaDaCompra {
  const antes = calcular(entrada);
  const depois = calcular({ ...entrada, compra: { valor: compra.preco, parcelas: compra.parcelas } });
  const { primeira, demais } = parcelaDoMes(compra);

  const t = antes.plano.tetos.find((x) => x.categoriaId === compra.categoriaId);
  const teto = t ? { restanteAntes: t.restante, restanteDepois: t.restante - primeira, cabe: primeira <= t.restante } : null;
  const aindaAntes = antes.plano.aindaPodeGastar;
  const limite = { aindaAntes, aindaDepois: aindaAntes - primeira, cabe: primeira <= aindaAntes };
  const previsao = antes.previsao ? { antes: antes.previsao.total, depois: antes.previsao.total + primeira } : null;

  const metas = antes.metas.escada.map((m) => {
    const d = depois.metas.escada.find((x) => x.id === m.id);
    const dataDepois = d?.dataNoRitmo ?? null;
    const mesesDeAtraso = m.dataNoRitmo && dataDepois ? Math.max(0, diferencaEmMeses(m.dataNoRitmo, dataDepois)) : null;
    return { id: m.id, nome: m.nome, dataAntes: m.dataNoRitmo, dataDepois, mesesDeAtraso };
  });

  const veredito: Veredito = !limite.cabe ? 'nao-cabe' : teto && !teto.cabe ? 'aperta' : 'cabe';
  return {
    valorNoMes: primeira,
    parcelasFuturas: compra.parcelas > 1 ? { quantidade: compra.parcelas - 1, valor: demais } : null,
    teto, limite, previsao, metas, veredito,
  };
}

/** Compras guardadas há 24 horas ou mais: aparecem na próxima abertura. */
export function comprasParaLembrar(pendentes: readonly CompraEmEspera[], agora: string): CompraEmEspera[] {
  return pendentes.filter((p) => Date.parse(agora) - Date.parse(p.guardadaEm) >= UM_DIA_EM_MS);
}
