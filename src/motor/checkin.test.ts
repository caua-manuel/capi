import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import { fazerCheckin } from './checkin';
import { ana, entrada } from './teste/pessoas';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string, extra: Partial<Lancamento> = {}): Lancamento => ({
  id: `c${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`, ...extra,
});

const historico = (valor: number, categoriaId: string) =>
  ['2026-09-10', '2026-10-10'].map((d) => gasto(valor, categoriaId, d));

// 2026-12-10 é quinta-feira; o domingo seguinte é 2026-12-13.
describe('Check-in semanal', () => {
  it('conta os dias até o domingo', () => {
    expect(fazerCheckin(entrada(ana)).diasAteDomingo).toBe(3);
    expect(fazerCheckin(entrada(ana, { hoje: '2026-12-13' })).diasAteDomingo).toBe(0);
  });

  it('mostra quanto ainda pode gastar até domingo em cada Categoria, sem passar do que resta no Teto', () => {
    const lancamentos = [...historico(60000, 'mercado'), ...historico(30000, 'delivery'), gasto(25000, 'delivery', '2026-12-02')];
    const c = fazerCheckin(entrada(ana, { lancamentos, hoje: '2026-12-10' }));
    const delivery = c.livrePorCategoria.find((x) => x.categoriaId === 'delivery')!;
    const mercado = c.livrePorCategoria.find((x) => x.categoriaId === 'mercado')!;
    expect(delivery.restante).toBeLessThan(mercado.restante);
    expect(mercado.livreAteDomingo).toBeGreaterThan(0);
    expect(mercado.livreAteDomingo).toBeLessThanOrEqual(mercado.restante);
  });

  it('Categoria que passou do Teto não tem nada livre', () => {
    const lancamentos = [...historico(30000, 'delivery'), gasto(90000, 'delivery', '2026-12-02')];
    const c = fazerCheckin(entrada(ana, { lancamentos }));
    const delivery = c.livrePorCategoria.find((x) => x.categoriaId === 'delivery')!;
    expect(delivery.livreAteDomingo).toBe(0);
    expect(delivery.estado).toBe('estourado');
  });

  it('no primeiro mês, sem Tetos, a lista vem vazia', () => {
    expect(fazerCheckin(entrada(ana)).livrePorCategoria).toEqual([]);
  });

  it('a sequência conta semanas seguidas dentro do Plano, só com semanas que têm Lançamentos', () => {
    // Domingo 2026-12-13: a semana é de 07 a 13/12. Limite do mês da Ana: R$ 1.920 → ~R$ 448 por semana.
    const dentro = (data: string) => gasto(10000, 'mercado', data);
    const lancamentos = [dentro('2026-12-08'), dentro('2026-12-01'), dentro('2026-11-25')];
    expect(fazerCheckin(entrada(ana, { lancamentos, hoje: '2026-12-13' })).semanasNoPlano).toBe(3);
  });

  it('a sequência para na primeira semana acima do ritmo ou sem Lançamentos', () => {
    const lancamentos = [gasto(10000, 'mercado', '2026-12-08'), gasto(900000, 'mercado', '2026-12-01'), gasto(10000, 'mercado', '2026-11-25')];
    expect(fazerCheckin(entrada(ana, { lancamentos, hoje: '2026-12-13' })).semanasNoPlano).toBe(1);
    expect(fazerCheckin(entrada(ana, { lancamentos: [], hoje: '2026-12-13' })).semanasNoPlano).toBe(0);
  });

  it('lista gastos do Apple Pay da semana que ficaram em Outros', () => {
    const lancamentos = [
      gasto(8000, 'outros', '2026-12-09', { origem: 'applepay', loja: 'Posto' }),
      gasto(3000, 'mercado', '2026-12-09', { origem: 'applepay' }),
      gasto(5000, 'outros', '2026-11-20', { origem: 'applepay' }),
    ];
    const c = fazerCheckin(entrada(ana, { lancamentos }));
    expect(c.semCategoria.map((l) => l.loja)).toEqual(['Posto']);
  });
});
