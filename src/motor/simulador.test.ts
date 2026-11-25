import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import type { Meta } from '../dominio/meta';
import { aplicarCenario, simularEse, type Cenario } from './simulador';
import { ana, entrada } from './teste/pessoas';
import { calcular } from './index';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string): Lancamento => ({
  id: `s${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});
const viagem: Meta = {
  id: 'viagem', nome: 'Viagem', objetivo: 'viagem', valorAlvo: 600000, valorAtual: 0, dataAlvo: '2027-10', prioridade: 2, podeMexer: false,
};
const reformaSemData: Meta = {
  id: 'reforma', nome: 'Reforma', objetivo: 'juntar-valor', valorAlvo: 1200000, valorAtual: 0, prioridade: 3, podeMexer: false,
};
const semMexer: Cenario = { metaId: 'viagem', corte: 0, guardarAMais: 0 };
const historico = ['2026-09-10', '2026-10-10', '2026-11-10'].flatMap((d) => [gasto(60000, 'delivery', d), gasto(40000, 'mercado', d)]);
const comViagem = entrada(ana, { metas: [viagem], lancamentos: historico });

describe('Simulador "E se…"', () => {
  it('sem mexer em nada, a data fica a mesma e o Aporte é o de hoje', () => {
    const r = simularEse(comViagem, semMexer);
    expect(r.meta!.dataDepois).toBe(r.meta!.dataAntes);
    expect(r.meta!.mesesDeDiferenca).toBe(0);
    expect(r.aporteDepois).toBe(r.aporteAntes);
  });

  it('a data da Meta com data parte da data-alvo dela', () => {
    expect(simularEse(comViagem, semMexer).meta!.dataAntes).toBe('2027-10');
  });

  it('guardar a mais adianta a Meta e soma ao Aporte', () => {
    const r = simularEse(comViagem, { ...semMexer, guardarAMais: 30000 });
    expect(r.aporteDepois).toBe(r.aporteAntes + 30000);
    expect(r.meta!.mesesDeDiferenca).toBeGreaterThan(0);
    expect(r.meta!.dataDepois! < r.meta!.dataAntes!).toBe(true);
  });

  it('cortar de uma Categoria conta como guardar a mais', () => {
    const cortando = simularEse(comViagem, { ...semMexer, categoriaId: 'delivery', corte: 20000 });
    const guardando = simularEse(comViagem, { ...semMexer, guardarAMais: 20000 });
    expect(cortando.meta!.dataDepois).toBe(guardando.meta!.dataDepois);
    expect(cortando.aporteDepois).toBe(guardando.aporteDepois);
  });

  it('subir o custo da Meta empurra a data para depois', () => {
    const r = simularEse(comViagem, { ...semMexer, novoCusto: 900000 });
    expect(r.meta!.mesesDeDiferenca).toBeLessThan(0);
    expect(r.meta!.dataDepois! > r.meta!.dataAntes!).toBe(true);
  });

  it('baixar o custo da Meta adianta a data', () => {
    const r = simularEse(comViagem, { ...semMexer, novoCusto: 400000 });
    expect(r.meta!.mesesDeDiferenca).toBeGreaterThan(0);
  });

  it('Meta sem data parte da data no ritmo do Motor e também adianta', () => {
    const e = entrada(ana, { metas: [reformaSemData], lancamentos: historico });
    const r = simularEse(e, { metaId: 'reforma', corte: 0, guardarAMais: 50000 });
    expect(r.meta!.dataAntes).toBe(calcular(e).metas.escada.find((m) => m.id === 'reforma')!.dataNoRitmo);
    expect(r.meta!.mesesDeDiferenca).toBeGreaterThan(0);
  });

  it('o corte máximo de uma Categoria é o Teto dela e o Teto cortado já vale no Plano', () => {
    const teto = calcular(comViagem).plano.tetos.find((t) => t.categoriaId === 'delivery')!.teto;
    expect(simularEse(comViagem, semMexer).cortesPossiveis.find((c) => c.categoriaId === 'delivery')!.maximo).toBe(teto);
    const { ajustes } = aplicarCenario(comViagem, { ...semMexer, categoriaId: 'delivery', corte: 20000 });
    const depois = calcular({ ...comViagem, ajustesDoPlano: ajustes }).plano.tetos.find((t) => t.categoriaId === 'delivery')!;
    expect(depois.teto).toBe(teto - 20000);
    expect(depois.restante).toBe(depois.teto - depois.gasto);
  });

  it('Aplicar ao plano grava o novo custo e a nova data da Meta', () => {
    const cenario = { ...semMexer, guardarAMais: 30000, novoCusto: 500000 };
    const { metas } = aplicarCenario(comViagem, cenario);
    const nova = metas.find((m) => m.id === 'viagem')!;
    expect(nova.valorAlvo).toBe(500000);
    expect(nova.dataAlvo).toBe(simularEse(comViagem, cenario).meta!.dataDepois);
  });

  it('Aplicar sem mexer em nada não muda nada', () => {
    const { metas, ajustes } = aplicarCenario(comViagem, semMexer);
    expect(metas).toEqual([viagem]);
    expect(ajustes).toEqual({ cortes: {} });
  });

  it('cortes aplicados duas vezes na mesma Categoria se somam', () => {
    const um = aplicarCenario(comViagem, { ...semMexer, categoriaId: 'delivery', corte: 10000 });
    const dois = aplicarCenario({ ...comViagem, ajustesDoPlano: um.ajustes }, { ...semMexer, categoriaId: 'delivery', corte: 10000 });
    expect(dois.ajustes.cortes.delivery).toBe(20000);
  });

  it('sem Metas criadas não há o que simular', () => {
    expect(simularEse(entrada(ana, { lancamentos: historico }), semMexer).meta).toBeNull();
  });
});
