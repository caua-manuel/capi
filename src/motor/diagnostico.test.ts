import { describe, expect, it } from 'vitest';
import { ana, bruno, carla, onboarding, rodar } from './teste/pessoas';
import { PARAMETROS_PADRAO } from './parametros';
import type { Lancamento } from '../dominio/lancamento';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string, loja = 'Loja'): Lancamento => ({
  id: `g${++seq}`, valor, loja, categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});

describe('Diagnóstico', () => {
  it('Sobra é a renda menos fixos, variáveis, parcelas e 1/12 dos anuais', () => {
    const comAnual = onboarding({ ...ana, anuais: [{ id: 'ipva', nome: 'IPVA', valor: 120000, mes: 1 }] });
    // 4.000 − (300 moradia + 60 + 120 fixos + 800 + 700 variáveis + 100 do IPVA) = 1.920
    expect(rodar(comAnual).diagnostico.sobra).toBe(192000);
  });

  it('taxa de poupança é a Sobra dividida pela renda', () => {
    // Sobra 2.020 de 4.000
    expect(rodar(ana).diagnostico.taxaDePoupanca).toBeCloseTo(0.505, 3);
  });

  it('meses de fôlego são a reserva atual dividida pelo custo de vida', () => {
    // 5.000 ÷ 1.980
    expect(rodar(ana).diagnostico.mesesDeFolego).toBeCloseTo(2.525, 2);
  });

  it('renda variável usa a média dos 3 piores meses dos últimos 6', () => {
    // piores: 2.000, 2.500 e 3.000 → 2.500
    expect(rodar(bruno).diagnostico.renda).toBe(250000);
  });

  it('renda variável sem os meses informados usa o valor declarado', () => {
    const semMeses = onboarding({ ...bruno, renda: { valor: 300000, tipo: 'varia-pouco', ultimosMeses: [] } });
    expect(rodar(semMeses).diagnostico.renda).toBe(300000);
  });

  it('divide o mês em Essencial, Estilo de vida e Guardar pela renda', () => {
    const { divisao } = rodar(ana).diagnostico;
    // Essencial 300 + 60 + 800 = 1.160; Estilo 120 + 700 = 820; Guardar 2.020
    expect(divisao.essencial).toBeCloseTo(0.29, 3);
    expect(divisao.estiloDeVida).toBeCloseTo(0.205, 3);
    expect(divisao.guardar).toBeCloseTo(0.505, 3);
  });

  it('parcelas de Dívidas contam como Essencial', () => {
    // Essencial 1.200 + 100 + 600 + 400 de parcela = 2.300 de 2.500
    expect(rodar(bruno).diagnostico.divisao.essencial).toBeCloseTo(0.92, 3);
  });

  it('a divisão ideal padrão é 50-30-20', () => {
    expect(rodar(carla).diagnostico.divisaoIdeal).toEqual({ essencial: 50, estiloDeVida: 30, guardar: 20 });
  });

  it('quem mora com a família e paga pouca moradia mira 40-20-40', () => {
    expect(rodar(ana).diagnostico.divisaoIdeal).toEqual({ essencial: 40, estiloDeVida: 20, guardar: 40 });
  });

  it('quem mora com a família mas paga moradia alta continua no 50-30-20', () => {
    const moradiaAlta = onboarding({ ...ana, moradia: { comQuem: 'familia', valor: 120000 } });
    expect(rodar(moradiaAlta).diagnostico.divisaoIdeal).toEqual({ essencial: 50, estiloDeVida: 30, guardar: 20 });
  });

  it('renda abaixo de 2 salários mínimos começa com 60-30-10', () => {
    expect(rodar(bruno).diagnostico.divisaoIdeal).toEqual({ essencial: 60, estiloDeVida: 30, guardar: 10 });
  });

  it('o limite de 2 salários mínimos vem da tabela de Parâmetros', () => {
    const comSalarioAlto = rodar(carla, { parametros: { ...PARAMETROS_PADRAO, salarioMinimo: 500000 } });
    expect(comSalarioAlto.diagnostico.divisaoIdeal).toEqual({ essencial: 60, estiloDeVida: 30, guardar: 10 });
  });

  it('o 60-30-10 sobe 2 pontos de Guardar por trimestre até chegar no 50-30-20', () => {
    // Respondido em 24/11/2026; em 10/06/2027 já passaram 2 trimestres completos.
    expect(rodar(bruno, { hoje: '2027-06-10' }).diagnostico.divisaoIdeal).toEqual({ essencial: 56, estiloDeVida: 30, guardar: 14 });
    expect(rodar(bruno, { hoje: '2029-01-10' }).diagnostico.divisaoIdeal).toEqual({ essencial: 50, estiloDeVida: 30, guardar: 20 });
  });

  it('gastos lançados no mês anterior substituem a estimativa do Onboarding', () => {
    const lancamentos = [gasto(50000, 'mercado', '2026-11-05'), gasto(30000, 'delivery', '2026-11-12'), gasto(99999, 'lazer', '2026-12-02')];
    // Mês de referência: novembro. Variáveis = 500 + 300 em vez de 800 + 700.
    // 4.000 − (300 + 60 + 120 + 500 + 300) = 2.720
    expect(rodar(ana, { lancamentos }).diagnostico.sobra).toBe(272000);
  });
});

describe('Status do Diagnóstico', () => {
  it('Sobra negativa deixa o Status vermelho', () => {
    const d = rodar(onboarding({ ...carla, variaveis: { essencial: 500000, estiloDeVida: 100000 } })).diagnostico;
    expect(d.sobra).toBeLessThan(0);
    expect(d.status).toBe('vermelho');
    expect(d.mensagem).toBe('Antes de qualquer meta: parar o vazamento e tratar a dívida cara.');
  });

  it('Dívida com juros acima de 5% ao mês deixa o Status vermelho', () => {
    expect(rodar(bruno).diagnostico.status).toBe('vermelho');
    const caraSemSobraNegativa = onboarding({
      ...carla,
      dividas: [{ id: 'd', nome: 'Empréstimo', tipo: 'emprestimo', saldo: 100000, jurosMensal: 0.06, parcela: 10000, emAtraso: false }],
    });
    expect(rodar(caraSemSobraNegativa).diagnostico.status).toBe('vermelho');
  });

  it('Dívida com juros de exatamente 5% ao mês não deixa vermelho sozinha', () => {
    const d = onboarding({
      ...carla,
      dividas: [{ id: 'd', nome: 'Empréstimo', tipo: 'emprestimo', saldo: 100000, jurosMensal: 0.05, parcela: 10000, emAtraso: false }],
    });
    expect(rodar(d).diagnostico.status).not.toBe('vermelho');
  });

  it('Dívida em atraso deixa o Status vermelho', () => {
    const atrasada = onboarding({
      ...carla,
      dividas: [{ id: 'd', nome: 'Loja', tipo: 'outro', saldo: 50000, jurosMensal: 0.02, parcela: 5000, emAtraso: true }],
    });
    expect(rodar(atrasada).diagnostico.status).toBe('vermelho');
  });

  it('Sobra entre 0% e 10% deixa o Status amarelo', () => {
    // 8.000 − (2.000 + 500 + 3.000 + 2.000) = 500 → 6,25%
    const apertada = onboarding({ ...carla, variaveis: { essencial: 300000, estiloDeVida: 200000 } });
    const d = rodar(apertada).diagnostico;
    expect(d.status).toBe('amarelo');
    expect(d.mensagem).toBe('Você fecha o mês, mas qualquer imprevisto vira dívida.');
  });

  it('reserva abaixo de 1 mês deixa o Status amarelo mesmo com Sobra boa', () => {
    const semReserva = onboarding({ ...carla, guardado: { valor: 100000, onde: 'conta' } });
    expect(rodar(semReserva).diagnostico.status).toBe('amarelo');
  });

  it('Sobra entre 10% e 30% com reserva de 1 mês ou mais é verde', () => {
    // 8.000 − (2.000 + 500 + 2.000 + 2.000) = 1.500 → 18,75%
    const d = rodar(onboarding({ ...carla, variaveis: { essencial: 200000, estiloDeVida: 200000 } })).diagnostico;
    expect(d.status).toBe('verde');
    expect(d.mensagem).toBe('Base boa; agora é dar destino ao dinheiro.');
  });

  it('Sobra acima de 30% sem reserva completa continua verde', () => {
    // Ana: 50% de Sobra, mas 2,5 meses de reserva e CLT pede 6
    expect(rodar(ana).diagnostico.status).toBe('verde');
  });

  it('Sobra acima de 30% com reserva completa é azul', () => {
    // Carla: 8.000 − 4.500 = 3.500 (43%); servidora pede 3 meses = 13.500 e tem 15.000
    const d = rodar(carla).diagnostico;
    expect(d.status).toBe('azul');
    expect(d.mensagem).toBe('Hora de acelerar metas e investir.');
  });
});

describe('Meses de reserva recomendados', () => {
  it('servidor público: 3 meses', () => {
    expect(rodar(carla).diagnostico.mesesDeReservaRecomendados).toBe(3);
  });

  it('CLT: 6 meses', () => {
    expect(rodar(ana).diagnostico.mesesDeReservaRecomendados).toBe(6);
  });

  it('PJ, autônomo ou empresa da família: 9 meses', () => {
    expect(rodar(onboarding({ ...carla, trabalho: 'empresa-familia' })).diagnostico.mesesDeReservaRecomendados).toBe(9);
  });

  it('renda muito variável ou dependentes: 12 meses', () => {
    expect(rodar(bruno).diagnostico.mesesDeReservaRecomendados).toBe(12);
    expect(rodar(onboarding({ ...carla, temDependentes: true })).diagnostico.mesesDeReservaRecomendados).toBe(12);
  });

  it('a reserva recomendada é os meses vezes o custo de vida', () => {
    expect(rodar(carla).diagnostico.reservaRecomendada).toBe(3 * 450000);
  });
});

describe('Sinais de alerta', () => {
  const tipos = (r: ReturnType<typeof rodar>) => r.diagnostico.sinais.map((s) => s.tipo);

  it('Estilo de vida acima de 35% da renda', () => {
    const gastadora = onboarding({ ...carla, variaveis: { essencial: 100000, estiloDeVida: 300000 } });
    expect(tipos(rodar(gastadora))).toContain('estilo-de-vida-alto');
    expect(tipos(rodar(carla))).not.toContain('estilo-de-vida-alto');
  });

  it('Assinaturas acima de 8% da renda', () => {
    const lancamentos = [gasto(40000, 'assinaturas', '2026-11-03')];
    expect(tipos(rodar(ana, { lancamentos }))).toContain('assinaturas-altas');
  });

  it('mais de 15 compras pequenas na mesma Categoria no mês', () => {
    const lancamentos = Array.from({ length: 16 }, (_, i) => gasto(2500, 'delivery', `2026-11-${String(i + 1).padStart(2, '0')}`));
    expect(tipos(rodar(ana, { lancamentos }))).toContain('muitas-compras-pequenas');
    expect(tipos(rodar(ana, { lancamentos: lancamentos.slice(1) }))).not.toContain('muitas-compras-pequenas');
  });

  it('gasto real acima do declarado no Onboarding', () => {
    const lancamentos = [gasto(200000, 'mercado', '2026-11-05')];
    expect(tipos(rodar(ana, { lancamentos }))).toContain('gasto-acima-do-declarado');
  });

  it('uso de rotativo do cartão', () => {
    expect(tipos(rodar(bruno))).toContain('rotativo');
  });

  it('nenhum sinal quando está tudo em ordem', () => {
    expect(rodar(carla).diagnostico.sinais).toEqual([]);
  });
});
