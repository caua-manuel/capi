import { nomesParecidos } from '../conciliacao/conciliacao';
import type { Fatura } from '../dominio/fatura';
import type { Fixo } from '../dominio/fixo';
import type { Lancamento } from '../dominio/lancamento';
import { dataNoMes, diferencaEmDias, diferencaEmMeses, mesDaData, somarDias, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import { fixosDoMes } from './fixos';
import type { Recorrente } from './recorrentes';

/** Datas do cartão do Usuário. */
export interface Cartao {
  diaDeFechamento: number;
  diaDeVencimento: number;
}

export type OrigemDoItem = 'lancamento' | 'parcela' | 'recorrente' | 'fixo';

export interface ItemDaPrevisao {
  origem: OrigemDoItem;
  loja: string;
  valor: Centavos;
  categoriaId: string;
  /** Data da compra ou data esperada, AAAA-MM-DD. */
  data: string;
  parcela?: { atual: number; total: number };
}

export interface CategoriaNaPrevisao {
  categoriaId: string;
  total: Centavos;
  /** As Lojas que mais pesaram, da maior para a menor. */
  lojas: { loja: string; total: Centavos }[];
}

export interface PrevisaoDeFatura {
  ciclo: { de: string; ate: string; vencimento: string };
  diasAteFechamento: number;
  total: Centavos;
  porCategoria: CategoriaNaPrevisao[];
  itens: ItemDaPrevisao[];
}

const TOLERANCIA_DE_DIAS = 3;
const LOJAS_POR_CATEGORIA = 3;

/** Lançamento pago no cartão: o que veio da Fatura ou do Apple Pay, e os manuais que não são Pix. */
export function noCartao(l: Lancamento): boolean {
  if (l.origem !== 'manual') return true;
  return l.categoriaId !== 'pix-pessoas' && !/^pix\b/i.test(l.loja.trim());
}

export function cicloDaFatura(hoje: string, cartao: Cartao) {
  const mes = mesDaData(hoje);
  const fechaEsteMes = Number(hoje.slice(8, 10)) <= cartao.diaDeFechamento;
  const mesDoFechamento = fechaEsteMes ? mes : somarMeses(mes, 1);
  const ate = dataNoMes(mesDoFechamento, cartao.diaDeFechamento);
  const de = somarDias(dataNoMes(somarMeses(mesDoFechamento, -1), cartao.diaDeFechamento), 1);
  const mesDoVencimento = cartao.diaDeVencimento > cartao.diaDeFechamento ? mesDoFechamento : somarMeses(mesDoFechamento, 1);
  return { de, ate, vencimento: dataNoMes(mesDoVencimento, cartao.diaDeVencimento) };
}

export interface EntradaDaPrevisao {
  hoje: string;
  cartao: Cartao;
  lancamentos: readonly Lancamento[];
  faturas: readonly Fatura[];
  fixos: readonly Fixo[];
  recorrentes: readonly Recorrente[];
  iofInternacional: number;
}

export function preverFatura(e: EntradaDaPrevisao): PrevisaoDeFatura {
  const ciclo = cicloDaFatura(e.hoje, e.cartao);
  const noCiclo = (data: string) => data >= ciclo.de && data <= ciclo.ate;
  const mesesDoCiclo = [mesDaData(ciclo.de), mesDaData(ciclo.ate)].filter((m, i, l) => l.indexOf(m) === i);
  const itens: ItemDaPrevisao[] = [];

  // 1. Lançamentos do ciclo pagos no cartão (data da compra).
  const lancados = e.lancamentos.filter((l) => noCartao(l) && noCiclo(l.data));
  for (const l of lancados) itens.push({ origem: 'lancamento', loja: l.loja, valor: l.valor, categoriaId: l.categoriaId, data: l.data, ...(l.parcela ? { parcela: l.parcela } : {}) });

  // 2. A próxima Parcela das compras parceladas da última Fatura antes deste ciclo.
  const anteriores = e.faturas.filter((f) => f.fechamento < ciclo.ate).sort((a, b) => b.fechamento.localeCompare(a.fechamento));
  const ultima = anteriores[0];
  if (ultima) {
    const passos = diferencaEmMeses(mesDaData(ultima.fechamento), mesDaData(ciclo.ate));
    for (const linha of ultima.linhas) {
      if (linha.tipo !== 'compra' || !linha.parcela) continue;
      const atual = linha.parcela.atual + passos;
      if (passos < 1 || atual > linha.parcela.total) continue;
      // Parcela já lançada à mão neste ciclo: não conta de novo.
      const total = linha.parcela.total;
      if (lancados.some((l) => l.parcela?.atual === atual && l.parcela.total === total && nomesParecidos(l.loja, linha.loja))) continue;
      itens.push({
        origem: 'parcela', loja: linha.loja, valor: linha.valor, categoriaId: linha.categoriaId ?? 'outros', data: ciclo.ate,
        parcela: { atual, total: linha.parcela.total },
      });
    }
  }

  // 3. Fixos no cartão que caem neste ciclo.
  const fixos = mesesDoCiclo.flatMap((m) => fixosDoMes(e.fixos, m)).filter((f) => f.forma === 'cartao' && noCiclo(f.data));
  for (const f of fixos) itens.push({ origem: 'fixo', loja: f.nome, valor: f.valor, categoriaId: f.categoriaId, data: f.data });

  // 4. Recorrentes esperados no ciclo que ainda não foram lançados (e que não são um Fixo já contado).
  for (const r of e.recorrentes) {
    const data = mesesDoCiclo.map((m) => dataNoMes(m, r.dia)).find(noCiclo);
    if (!data) continue;
    const jaLancado = lancados.some((l) => nomesParecidos(l.loja, r.loja) && Math.abs(l.valor - r.valor) <= r.valor * 0.1);
    const ehFixo = fixos.some((f) => f.valor === r.valor && Math.abs(diferencaEmDias(f.data, data)) <= TOLERANCIA_DE_DIAS);
    if (jaLancado || ehFixo) continue;
    const valor = Math.round(r.valor * (r.emDolar ? 1 + e.iofInternacional : 1));
    itens.push({ origem: 'recorrente', loja: r.loja, valor, categoriaId: r.categoriaId ?? 'assinaturas', data });
  }

  const porCategoria = new Map<string, { total: Centavos; lojas: Map<string, Centavos> }>();
  for (const i of itens) {
    const c = porCategoria.get(i.categoriaId) ?? { total: 0, lojas: new Map() };
    c.total += i.valor;
    c.lojas.set(i.loja, (c.lojas.get(i.loja) ?? 0) + i.valor);
    porCategoria.set(i.categoriaId, c);
  }

  return {
    ciclo,
    diasAteFechamento: diferencaEmDias(e.hoje, ciclo.ate),
    total: itens.reduce((s, i) => s + i.valor, 0),
    porCategoria: [...porCategoria].map(([categoriaId, c]) => ({
      categoriaId, total: c.total,
      lojas: [...c.lojas].map(([loja, total]) => ({ loja, total })).sort((a, b) => b.total - a.total).slice(0, LOJAS_POR_CATEGORIA),
    })).sort((a, b) => b.total - a.total),
    itens,
  };
}
