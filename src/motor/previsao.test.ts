import { describe, expect, it } from 'vitest';
import type { Fatura, LinhaDeFatura } from '../dominio/fatura';
import type { Fixo } from '../dominio/fixo';
import type { Lancamento } from '../dominio/lancamento';
import { ana, rodar } from './teste/pessoas';

// Dados fictícios. Nenhuma fatura real.
const cartao = { diaDeFechamento: 5, diaDeVencimento: 15 };
let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string, loja = 'Loja', extra: Partial<Lancamento> = {}): Lancamento => ({
  id: `v${++seq}`, valor, loja, categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`, ...extra,
});
const linha = (data: string, loja: string, valor: number, extra: Partial<LinhaDeFatura> = {}): LinhaDeFatura => ({
  id: `fl${++seq}`, data, loja, valor, tipo: 'compra', ...extra,
});
const fatura = (fechamento: string, linhas: LinhaDeFatura[]): Fatura => ({ id: fechamento, fechamento, vencimento: fechamento, linhas });
const fixo = (id: string, valor: number, dia: number, forma: 'cartao' | 'fora', categoriaId = 'treino'): Fixo => ({
  id, versoes: [{ aPartirDe: '2026-01', nome: id, valor, dia, categoriaId, forma }],
});

describe('Ciclo da Fatura', () => {
  it('depois do fechamento, a próxima Fatura fecha no mês seguinte', () => {
    const { previsao } = rodar(ana, { cartao }); // hoje 10/12
    expect(previsao!.ciclo).toEqual({ de: '2026-12-06', ate: '2027-01-05', vencimento: '2027-01-15' });
    expect(previsao!.diasAteFechamento).toBe(26);
  });

  it('antes do fechamento, a Fatura atual fecha neste mês', () => {
    const { previsao } = rodar(ana, { cartao, hoje: '2026-12-03' });
    expect(previsao!.ciclo).toEqual({ de: '2026-11-06', ate: '2026-12-05', vencimento: '2026-12-15' });
    expect(previsao!.diasAteFechamento).toBe(2);
  });

  it('respeita o dia de fechamento do cartão do Usuário', () => {
    const { previsao } = rodar(ana, { cartao: { diaDeFechamento: 20, diaDeVencimento: 28 } });
    expect(previsao!.ciclo).toEqual({ de: '2026-11-21', ate: '2026-12-20', vencimento: '2026-12-28' });
  });

  it('sem o dia de fechamento não há Previsão', () => {
    expect(rodar(ana).previsao).toBeNull();
  });
});

describe('Previsão de fatura', () => {
  it('soma os Lançamentos do ciclo pagos no cartão, sem Pix e sem os de fora do ciclo', () => {
    const lancamentos = [
      gasto(4200, 'delivery', '2026-12-07', 'iFood'),
      gasto(5000, 'pix-pessoas', '2026-12-08', 'pix joão'),
      gasto(9000, 'mercado', '2026-12-05', 'Mercado'),
    ];
    expect(rodar(ana, { cartao, lancamentos }).previsao!.total).toBe(4200);
  });

  it('soma a próxima Parcela das compras parceladas da última Fatura', () => {
    const faturas = [fatura('2026-12-05', [
      linha('2026-09-10', 'LOJA DE MOVEIS', 20000, { parcela: { atual: 3, total: 10 }, categoriaId: 'compras' }),
      linha('2026-03-10', 'CELULAR', 15000, { parcela: { atual: 10, total: 10 }, categoriaId: 'compras' }),
    ])];
    const { previsao } = rodar(ana, { cartao, faturas });
    expect(previsao!.total).toBe(20000);
    expect(previsao!.itens).toEqual([expect.objectContaining({ origem: 'parcela', loja: 'LOJA DE MOVEIS', parcela: { atual: 4, total: 10 } })]);
  });

  it('soma os Recorrentes que ainda não foram lançados neste ciclo', () => {
    const faturas = [
      fatura('2026-11-05', [linha('2026-10-20', 'SPOTIFY', 2190, { categoriaId: 'assinaturas' })]),
      fatura('2026-12-05', [linha('2026-11-20', 'SPOTIFY', 2190, { categoriaId: 'assinaturas' })]),
    ];
    expect(rodar(ana, { cartao, faturas }).previsao!.total).toBe(2190);
    const jaLancado = [gasto(2190, 'assinaturas', '2026-12-20', 'Spotify', { origem: 'applepay' })];
    expect(rodar(ana, { cartao, faturas, lancamentos: jaLancado, hoje: '2026-12-21' }).previsao!.total).toBe(2190);
  });

  it('soma os Fixos no cartão do ciclo e deixa de fora os Fixos fora do cartão', () => {
    const fixos = [fixo('academia', 9990, 20, 'cartao'), fixo('aluguel', 150000, 10, 'fora', 'casa-contas')];
    expect(rodar(ana, { cartao, fixos }).previsao!.total).toBe(9990);
  });

  it('separa por Categoria e mostra as Lojas que mais pesaram', () => {
    const lancamentos = [
      gasto(4200, 'delivery', '2026-12-07', 'iFood'),
      gasto(3800, 'delivery', '2026-12-08', 'iFood'),
      gasto(2500, 'delivery', '2026-12-09', 'Rappi'),
      gasto(23000, 'mercado', '2026-12-09', 'Mercado Central'),
    ];
    const { previsao } = rodar(ana, { cartao, lancamentos });
    expect(previsao!.porCategoria.map((c) => [c.categoriaId, c.total])).toEqual([['mercado', 23000], ['delivery', 10500]]);
    expect(previsao!.porCategoria[1]!.lojas).toEqual([{ loja: 'iFood', total: 8000 }, { loja: 'Rappi', total: 2500 }]);
  });
});
