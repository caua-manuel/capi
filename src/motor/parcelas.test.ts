import { describe, expect, it } from 'vitest';
import { gerarParcelas } from './parcelas';

const compra = { id: 'c1', valor: 300000, loja: 'Notebook', categoriaId: 'compras', data: '2026-11-25', origem: 'manual' as const, criadoEm: '2026-11-25T12:00:00Z' };
const ids = (() => { let n = 0; return () => `p${++n}`; })();

describe('Gerar Parcelas de uma compra parcelada', () => {
  it('cria uma Parcela por mês, com a mesma Loja e Categoria', () => {
    const ps = gerarParcelas(compra, 10, ids);
    expect(ps).toHaveLength(10);
    expect(ps.map((p) => p.parcela)).toEqual(Array.from({ length: 10 }, (_, i) => ({ atual: i + 1, total: 10 })));
    expect(new Set(ps.map((p) => p.loja + p.categoriaId)).size).toBe(1);
  });

  it('as datas seguem o dia da compra nos meses seguintes', () => {
    const ps = gerarParcelas(compra, 3, ids);
    expect(ps.map((p) => p.data)).toEqual(['2026-11-25', '2026-12-25', '2027-01-25']);
  });

  it('dia 31 cai no último dia dos meses mais curtos', () => {
    const ps = gerarParcelas({ ...compra, data: '2026-12-31' }, 3, ids);
    expect(ps.map((p) => p.data)).toEqual(['2026-12-31', '2027-01-31', '2027-02-28']);
  });

  it('as Parcelas somam o valor total, com o resto de centavos na primeira', () => {
    const ps = gerarParcelas({ ...compra, valor: 10000 }, 3, ids);
    expect(ps.map((p) => p.valor)).toEqual([3334, 3333, 3333]);
    expect(ps.reduce((s, p) => s + p.valor, 0)).toBe(10000);
  });

  it('todas ficam ligadas à mesma compra', () => {
    const ps = gerarParcelas(compra, 4, ids);
    expect(new Set(ps.map((p) => p.compraId))).toEqual(new Set(['c1']));
  });

  it('uma só Parcela é a própria compra, sem Parcela', () => {
    const [unica, ...resto] = gerarParcelas(compra, 1, ids);
    expect(resto).toEqual([]);
    expect(unica!.parcela).toBeUndefined();
    expect(unica!.valor).toBe(300000);
  });
});
