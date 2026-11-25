import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import { tetoDepoisDoGasto, type Plano } from './plano';
import { ana, bruno, rodar } from './teste/pessoas';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string): Lancamento => ({
  id: `p${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});

/** O mesmo gasto em setembro, outubro e novembro de 2026. */
const tresMeses = (valor: number, categoriaId: string) =>
  ['2026-09-10', '2026-10-10', '2026-11-10'].map((d) => gasto(valor, categoriaId, d));

describe('Plano do mês', () => {
  it('o limite do mês é a renda menos Fixos, parcelas, anuais e o quanto guardar', () => {
    // Ana: 4.000 − 480 de Fixos − 40% para guardar (1.600) = 1.920
    const { plano } = rodar(ana);
    expect(plano.guardarPorMes).toBe(160000);
    expect(plano.limiteDoMes).toBe(192000);
  });

  it('o quanto guardar nunca passa do que sobra depois dos compromissos', () => {
    const apertado = { ...bruno, moradia: { comQuem: 'sozinho' as const, valor: 230000 } };
    // 2.500 − 2.300 moradia − 100 internet − 400 parcela = −300
    const { plano } = rodar(apertado);
    expect(plano.guardarPorMes).toBe(0);
    expect(plano.limiteDoMes).toBe(0);
  });

  it('sem histórico de gastos o primeiro mês fica sem Tetos', () => {
    const { plano } = rodar(ana);
    expect(plano.tetos).toEqual([]);
    expect(plano.mesSemTetos).toBe(true);
  });

  it('os Tetos saem da média dos últimos meses de cada Categoria', () => {
    const lancamentos = [...tresMeses(60000, 'mercado'), ...tresMeses(30000, 'delivery'), ...tresMeses(20000, 'lazer')];
    const { plano } = rodar(ana, { lancamentos });
    const teto = (id: string) => plano.tetos.find((t) => t.categoriaId === id)?.teto;
    expect(plano.mesSemTetos).toBe(false);
    expect(teto('mercado')).toBe(60000);
    expect(teto('delivery')).toBe(30000);
    expect(teto('lazer')).toBe(20000);
  });

  it('Estilo de vida cabe no ideal do Grupo menos os Fixos dele', () => {
    // Ana: 20% de 4.000 = 800, menos 120 da academia = 680 para delivery e lazer
    const lancamentos = [...tresMeses(60000, 'delivery'), ...tresMeses(20000, 'lazer')];
    const { plano } = rodar(ana, { lancamentos });
    const soma = plano.tetos.filter((t) => t.categoriaId === 'delivery' || t.categoriaId === 'lazer').reduce((s, t) => s + t.teto, 0);
    expect(soma).toBeLessThanOrEqual(68000);
    expect(plano.tetos.find((t) => t.categoriaId === 'delivery')!.teto).toBeGreaterThan(plano.tetos.find((t) => t.categoriaId === 'lazer')!.teto);
  });

  it('Teto de Delivery cai quando a Sobra é negativa', () => {
    const lancamentos = [...tresMeses(60000, 'mercado'), ...tresMeses(50000, 'delivery'), ...tresMeses(30000, 'lazer')];
    const saida = rodar(bruno, { lancamentos });
    expect(saida.diagnostico.sobra).toBeLessThan(0);
    const delivery = saida.plano.tetos.find((t) => t.categoriaId === 'delivery')!;
    expect(delivery.teto).toBeLessThan(50000);
  });

  it('a soma dos Tetos nunca passa do limite do mês', () => {
    const lancamentos = [...tresMeses(150000, 'mercado'), ...tresMeses(80000, 'delivery')];
    const { plano } = rodar(ana, { lancamentos });
    expect(plano.tetos.reduce((s, t) => s + t.teto, 0)).toBeLessThanOrEqual(plano.limiteDoMes);
  });
});

describe('Quanto ainda pode gastar', () => {
  it('desconta os Lançamentos do mês do limite e divide pelos dias que faltam', () => {
    // Hoje 10/12: faltam 22 dias contando hoje
    const lancamentos = [gasto(20000, 'mercado', '2026-12-03')];
    const { plano } = rodar(ana, { lancamentos });
    expect(plano.gastoDoMes).toBe(20000);
    expect(plano.aindaPodeGastar).toBe(172000);
    expect(plano.diasRestantes).toBe(22);
    expect(plano.porDia).toBe(Math.floor(172000 / 22));
  });

  it('os Tetos usam a data da compra, não a do registro', () => {
    const lancamentos = [
      { ...gasto(10000, 'delivery', '2026-11-30'), criadoEm: '2026-12-02T10:00:00Z' },
      gasto(5000, 'delivery', '2026-12-01'),
    ];
    expect(rodar(ana, { lancamentos }).plano.gastoDoMes).toBe(5000);
  });

  it('quando o mês estourou, ainda pode gastar fica negativo e o por dia fica zero', () => {
    const lancamentos = [gasto(250000, 'compras', '2026-12-05')];
    const { plano } = rodar(ana, { lancamentos });
    expect(plano.aindaPodeGastar).toBe(-58000);
    expect(plano.porDia).toBe(0);
  });

  it('cada Teto mostra o gasto e o estado: normal, atenção a partir de 85% e estourado acima de 100%', () => {
    const historico = [...tresMeses(40000, 'mercado'), ...tresMeses(20000, 'delivery'), ...tresMeses(10000, 'lazer')];
    const doMes = [gasto(10000, 'mercado', '2026-12-02'), gasto(17000, 'delivery', '2026-12-03'), gasto(12000, 'lazer', '2026-12-04')];
    const { plano } = rodar(ana, { lancamentos: [...historico, ...doMes] });
    const estado = (id: string) => plano.tetos.find((t) => t.categoriaId === id);
    expect(estado('mercado')).toMatchObject({ gasto: 10000, restante: 30000, estado: 'normal' });
    expect(estado('delivery')).toMatchObject({ gasto: 17000, estado: 'atencao' });
    expect(estado('lazer')).toMatchObject({ gasto: 12000, estado: 'estourado' });
  });
});

describe('Teto depois de um gasto novo', () => {
  const planoComTeto = (gasto: number): Plano => ({
    mes: '2026-12', guardarPorMes: 0, limiteDoMes: 0, gastoDoMes: gasto, aindaPodeGastar: 0, porDia: 0, diasRestantes: 10, mesSemTetos: false,
    tetos: [{ categoriaId: 'delivery', teto: 50000, gasto, restante: 50000 - gasto, uso: gasto / 50000, estado: 'normal', media: 50000 }],
  });

  it('soma o gasto novo ao que já foi gasto na Categoria', () => {
    expect(tetoDepoisDoGasto(planoComTeto(30000), 'delivery', 4200)).toMatchObject({ gastoDepois: 34200, teto: 50000, estado: 'normal' });
  });

  it('avisa que passa do Teto', () => {
    expect(tetoDepoisDoGasto(planoComTeto(48000), 'delivery', 4200)).toMatchObject({ gastoDepois: 52200, estado: 'estourado' });
  });

  it('perto do Teto vira atenção', () => {
    expect(tetoDepoisDoGasto(planoComTeto(40000), 'delivery', 3000)?.estado).toBe('atencao');
  });

  it('ao editar um gasto, não conta o valor antigo duas vezes', () => {
    expect(tetoDepoisDoGasto(planoComTeto(30000), 'delivery', 5000, { valorAnterior: 4200 })?.gastoDepois).toBe(30800);
  });

  it('compra de outro mês não mexe no Teto deste mês', () => {
    expect(tetoDepoisDoGasto(planoComTeto(30000), 'delivery', 4200, { mesDaCompra: '2026-11' })).toBeNull();
  });

  it('Categoria sem Teto não tem linha', () => {
    expect(tetoDepoisDoGasto(planoComTeto(30000), 'mercado', 4200)).toBeNull();
  });
});
