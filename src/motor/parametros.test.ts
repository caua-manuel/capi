import { describe, expect, it } from 'vitest';
import type { Meta } from '../dominio/meta';
import { PARAMETROS_PADRAO } from './parametros';
import { ana, rodar } from './teste/pessoas';

const aposentadoria: Meta = {
  id: 'longa', nome: 'Juntar R$ 50 mil', objetivo: 'juntar-valor', valorAlvo: 5000000, valorAtual: 0,
  dataAlvo: '2029-12', prioridade: 2, podeMexer: false,
};

describe('Mudar um Parâmetro recalcula o Plano e as Metas', () => {
  it('Rendimento mensal maior diminui o Aporte de uma Meta longa', () => {
    const base = rodar(ana, { metas: [aposentadoria] });
    const rende = rodar(ana, { metas: [aposentadoria], parametros: { ...PARAMETROS_PADRAO, rendimentoMensalConservador: 0.012 } });
    const aporte = (s: typeof base) => s.metas.escada.find((m) => m.id === 'longa')?.aporte ?? 0;
    expect(aporte(base)).toBeGreaterThan(0);
    expect(aporte(rende)).toBeLessThan(aporte(base));
  });

  it('Rendimento zero faz o Aporte virar a divisão simples pelos meses', () => {
    const parado = rodar(ana, { metas: [aposentadoria], parametros: { ...PARAMETROS_PADRAO, rendimentoMensalConservador: 0 } });
    const meta = parado.metas.escada.find((m) => m.id === 'longa');
    expect(meta?.aporte).toBeGreaterThan(Math.floor(5000000 / 40));
  });
});
