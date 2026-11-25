import { describe, expect, it } from 'vitest';
import type { Fatura } from '../dominio/fatura';
import type { Fixo } from '../dominio/fixo';
import { montarCalendario, type EntradaDoCalendario } from './calendario';

const fixo = (id: string, nome: string, valor: number, dia: number): Fixo => ({
  id, versoes: [{ aPartirDe: '2026-01', nome, valor, dia, categoriaId: 'casa-contas', forma: 'fora' }],
});

const base: EntradaDoCalendario = {
  hoje: '2026-12-10', fixos: [], recorrentes: [], faturas: [], anuais: [], respondidoEm: '2026-06-10',
};

describe('Calendário dos próximos 3 meses', () => {
  it('mostra 3 meses, do mês de hoje em diante', () => {
    expect(montarCalendario(base).meses.map((m) => m.mes)).toEqual(['2026-12', '2027-01', '2027-02']);
  });

  it('lista os Fixos por data, e no mês de hoje só o que ainda não passou', () => {
    const c = montarCalendario({ ...base, fixos: [fixo('a', 'Aluguel', 100000, 5), fixo('b', 'Internet', 12000, 20)] });
    expect(c.meses[0]!.compromissos.map((x) => x.nome)).toEqual(['Internet']);
    expect(c.meses[1]!.compromissos.map((x) => [x.data, x.nome])).toEqual([['2027-01-05', 'Aluguel'], ['2027-01-20', 'Internet']]);
  });

  it('soma o total de cada mês e destaca o mais apertado', () => {
    const c = montarCalendario({
      ...base,
      fixos: [fixo('a', 'Aluguel', 100000, 15)],
      anuais: [{ id: 'ipva', nome: 'IPVA', valor: 120000, mes: 1 }],
    });
    expect(c.meses.map((m) => m.total)).toEqual([100000, 220000, 100000]);
    expect(c.maisApertado).toBe('2027-01');
    expect(c.meses[1]!.apertado).toBe(true);
    expect(c.meses[0]!.apertado).toBe(false);
  });

  it('Anual mostra a Caixinha e quanto falta', () => {
    const c = montarCalendario({ ...base, anuais: [{ id: 'ipva', nome: 'IPVA', valor: 120000, mes: 1 }] });
    const ipva = c.meses[1]!.compromissos.find((x) => x.tipo === 'anual')!;
    // 6 meses completos desde o Onboarding: 120000 ÷ 12 × 6
    expect(ipva.caixinha).toEqual({ guardado: 60000, falta: 60000 });
  });

  it('próximas Parcelas da última Fatura entram nos meses seguintes até acabar', () => {
    const fatura: Fatura = {
      id: 'f', fechamento: '2026-12-05', vencimento: '2026-12-12',
      linhas: [{ id: 'l1', data: '2026-11-20', loja: 'Loja X', valor: 30000, tipo: 'compra', parcela: { atual: 2, total: 3 } }],
    };
    const c = montarCalendario({ ...base, faturas: [fatura], cartao: { diaDeFechamento: 5, diaDeVencimento: 12 } });
    const parcelas = c.meses.flatMap((m) => m.compromissos.filter((x) => x.tipo === 'parcela'));
    expect(parcelas).toHaveLength(1);
    expect(parcelas[0]).toMatchObject({ data: '2027-01-12', valor: 30000 });
  });

  it('Recorrente que já é um Fixo não conta duas vezes', () => {
    const c = montarCalendario({
      ...base,
      fixos: [fixo('n', 'Netflix', 4490, 15)],
      recorrentes: [{ loja: 'Netflix', chave: 'netflix', valor: 4490, valorAnterior: 4490, dia: 15, faturas: 3, custoAnual: 53880, emDolar: false, aumento: false, duplicada: false, nomeGenerico: false }],
    });
    expect(c.meses[1]!.compromissos).toHaveLength(1);
  });

  it('sem compromissos, nenhum mês aperta', () => {
    const c = montarCalendario(base);
    expect(c.maisApertado).toBeNull();
    expect(c.meses.every((m) => m.total === 0 && !m.apertado)).toBe(true);
  });
});
