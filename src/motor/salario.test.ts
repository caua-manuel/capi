import { describe, expect, it } from 'vitest';
import { montarCalendario, type EntradaDoCalendario } from './calendario';
import { dataDoSalario } from './salario';

describe('Dia do salário', () => {
  it('antes do dia, o próximo pagamento é neste mês e o último foi no mês passado', () => {
    expect(dataDoSalario('2026-12-03', 5)).toEqual({ proximo: '2026-12-05', ultimo: '2026-11-05', diasAteOProximo: 2, ehHoje: false });
  });

  it('depois do dia, o próximo pagamento é no mês seguinte', () => {
    expect(dataDoSalario('2026-12-10', 5)).toEqual({ proximo: '2027-01-05', ultimo: '2026-12-05', diasAteOProximo: 26, ehHoje: false });
  });

  it('no dia do salário, hoje é o Dia do pagamento', () => {
    expect(dataDoSalario('2026-12-05', 5)).toEqual({ proximo: '2026-12-05', ultimo: '2026-12-05', diasAteOProximo: 0, ehHoje: true });
  });

  it('dia 31 cai no último dia dos meses mais curtos', () => {
    expect(dataDoSalario('2027-02-10', 31).proximo).toBe('2027-02-28');
    expect(dataDoSalario('2027-03-01', 31).ultimo).toBe('2027-02-28');
  });
});

describe('Salário no Calendário', () => {
  const base: EntradaDoCalendario = {
    hoje: '2026-12-10', fixos: [], recorrentes: [], faturas: [], anuais: [], respondidoEm: '2026-06-10',
    salario: { dia: 5, valor: 400000 },
  };

  it('aparece no dia certo de cada mês que ainda vem, sem passar do mês de hoje', () => {
    const c = montarCalendario(base);
    expect(c.meses[0]!.compromissos.filter((x) => x.tipo === 'salario')).toEqual([]);
    expect(c.meses[1]!.compromissos.find((x) => x.tipo === 'salario')).toMatchObject({ data: '2027-01-05', nome: 'Salário', valor: 400000 });
    expect(c.meses[2]!.compromissos.find((x) => x.tipo === 'salario')?.data).toBe('2027-02-05');
  });

  it('é entrada: não soma no total do mês nem deixa o mês apertado', () => {
    const c = montarCalendario(base);
    expect(c.meses.map((m) => m.total)).toEqual([0, 0, 0]);
    expect(c.maisApertado).toBeNull();
  });

  it('sem o dia do salário, o Calendário não mostra salário', () => {
    const c = montarCalendario({ ...base, salario: undefined });
    expect(c.meses.flatMap((m) => m.compromissos)).toEqual([]);
  });
});
