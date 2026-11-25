import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import type { Meta } from '../dominio/meta';
import { fecharMes } from './fechamento';
import { ana, entrada } from './teste/pessoas';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string): Lancamento => ({
  id: `z${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});

/** Três meses de histórico (ago, set, out) com o mesmo gasto. */
const historico = (valor: number, categoriaId: string) =>
  ['2026-08-10', '2026-09-10', '2026-10-10'].map((d) => gasto(valor, categoriaId, d));

const viagem: Meta = {
  id: 'viagem', nome: 'Viagem', objetivo: 'viagem', valorAlvo: 600000, valorAtual: 0, dataAlvo: '2027-10', prioridade: 2, podeMexer: false,
};

describe('Fechamento mensal', () => {
  it('a primeira Fatura vira o Mês do plano 0: sem Tetos, mas já gera os Tetos do mês seguinte', () => {
    const lancamentos = [gasto(60000, 'mercado', '2026-11-10'), gasto(30000, 'delivery', '2026-11-12')];
    const p = fecharMes(entrada(ana, { lancamentos }), '2026-11');
    expect(p.mesZero).toBe(true);
    expect(p.totalDeCategorias).toBe(0);
    expect(p.proximoMes).toBe('2026-12');
    expect(p.proximoPlano.mesSemTetos).toBe(false);
    expect(p.proximoPlano.tetos.length).toBeGreaterThan(0);
  });

  it('o placar conta quantas Categorias ficaram dentro do Teto', () => {
    const lancamentos = [
      ...historico(60000, 'mercado'), ...historico(30000, 'delivery'),
      gasto(40000, 'mercado', '2026-11-10'), gasto(90000, 'delivery', '2026-11-12'),
    ];
    const p = fecharMes(entrada(ana, { lancamentos }), '2026-11');
    expect(p.mesZero).toBe(false);
    expect(p.totalDeCategorias).toBe(2);
    expect(p.categoriasNoTeto).toBe(1);
    expect(p.estouradas.map((c) => c.categoriaId)).toEqual(['delivery']);
    expect(p.estouradas[0]!.excesso).toBeGreaterThan(0);
  });

  it('o dinheiro salvo é a soma do que ficou abaixo do Teto', () => {
    const lancamentos = [...historico(60000, 'mercado'), gasto(40000, 'mercado', '2026-11-10')];
    const p = fecharMes(entrada(ana, { lancamentos }), '2026-11');
    expect(p.dinheiroSalvo).toBe(20000);
  });

  it('virar aporte de uma Meta mostra quantas semanas ela chega antes', () => {
    const lancamentos = [...historico(60000, 'mercado'), gasto(30000, 'mercado', '2026-11-10')];
    const p = fecharMes(entrada(ana, { lancamentos, metas: [viagem] }), '2026-11');
    expect(p.aporteExtra).not.toBeNull();
    expect(p.aporteExtra!.metaId).toBe('viagem');
    expect(p.aporteExtra!.valor).toBe(p.dinheiroSalvo);
    expect(p.aporteExtra!.semanasAntes).toBeGreaterThanOrEqual(0);
  });

  it('mês estourado não apaga nada e mostra o atraso nas Metas', () => {
    const lancamentos = [...historico(60000, 'mercado'), gasto(900000, 'mercado', '2026-11-10')];
    const p = fecharMes(entrada(ana, { lancamentos, metas: [viagem] }), '2026-11');
    expect(p.excesso).toBeGreaterThan(0);
    expect(p.impactoNasMetas).not.toBeNull();
    expect(p.impactoNasMetas!.diasDeAtraso).toBeGreaterThan(0);
    expect(p.proximoPlano.limiteDoMes).toBeGreaterThanOrEqual(0);
  });

  it('mês dentro do plano não tem impacto nas Metas', () => {
    const lancamentos = [...historico(60000, 'mercado'), gasto(10000, 'mercado', '2026-11-10')];
    const p = fecharMes(entrada(ana, { lancamentos, metas: [viagem] }), '2026-11');
    expect(p.excesso).toBe(0);
    expect(p.impactoNasMetas).toBeNull();
  });
});
