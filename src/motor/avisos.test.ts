import { describe, expect, it } from 'vitest';
import type { Fatura, LinhaDeFatura } from '../dominio/fatura';
import type { Lancamento } from '../dominio/lancamento';
import { PARAMETROS_PADRAO } from './parametros';
import { ana, bruno, carla, onboarding, rodar } from './teste/pessoas';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string, loja = 'Loja'): Lancamento => ({
  id: `a${++seq}`, valor, loja, categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});
const tresMeses = (valor: number, categoriaId: string) => ['2026-09-10', '2026-10-10', '2026-11-10'].map((d) => gasto(valor, categoriaId, d));
const linha = (data: string, loja: string, valor: number): LinhaDeFatura => ({ id: `al${++seq}`, data, loja, valor, tipo: 'compra' });
const fatura = (fechamento: string, linhas: LinhaDeFatura[]): Fatura => ({ id: fechamento, fechamento, vencimento: fechamento, linhas });
const tipos = (r: ReturnType<typeof rodar>) => r.avisos.map((a) => a.tipo);

// Histórico de Ana: Teto de Delivery R$ 200.
const historico = [...tresMeses(40000, 'mercado'), ...tresMeses(20000, 'delivery')];

describe('Avisos', () => {
  it('Teto em 80% antes do dia 20', () => {
    const r = rodar(ana, { lancamentos: [...historico, gasto(17000, 'delivery', '2026-12-05')] });
    expect(r.avisos).toContainEqual(expect.objectContaining({ tipo: 'teto-80', categoriaId: 'delivery', gasto: 17000, teto: 20000, diasRestantes: 22 }));
  });

  it('depois do dia 20 o aviso de 80% não aparece', () => {
    const r = rodar(ana, { hoje: '2026-12-21', lancamentos: [...historico, gasto(17000, 'delivery', '2026-12-05')] });
    expect(tipos(r)).not.toContain('teto-80');
  });

  it('Teto estourado mostra quanto passou', () => {
    const r = rodar(ana, { lancamentos: [...historico, gasto(25600, 'delivery', '2026-12-05')] });
    expect(r.avisos).toContainEqual(expect.objectContaining({ tipo: 'teto-estourado', categoriaId: 'delivery', excesso: 5600 }));
  });

  it('ritmo diário: gasto do mês acima da linha ideal mostra o quanto por dia', () => {
    // Limite 1.920; no dia 10 de 31 a linha ideal é ~619
    const r = rodar(ana, { lancamentos: [gasto(100000, 'compras', '2026-12-03')] });
    expect(r.avisos).toContainEqual(expect.objectContaining({ tipo: 'ritmo-diario', porDia: r.plano.porDia }));
  });

  it('assinatura chegando: 2 dias antes da cobrança prevista', () => {
    const faturas = [fatura('2026-11-05', [linha('2026-10-12', 'PRIME VIDEO', 1990)]), fatura('2026-12-05', [linha('2026-11-12', 'PRIME VIDEO', 1990)])];
    expect(rodar(ana, { faturas }).avisos).toContainEqual(expect.objectContaining({ tipo: 'assinatura-chegando', loja: 'PRIME VIDEO', valor: 1990, data: '2026-12-12' }));
  });

  it('gasto anual chegando: 30 dias antes, com o que a Caixinha já tem', () => {
    const comIpva = onboarding({ ...ana, anuais: [{ id: 'ipva', nome: 'IPVA', valor: 120000, mes: 1 }] });
    expect(rodar(comIpva).avisos).toContainEqual(expect.objectContaining({ tipo: 'anual-chegando', nome: 'IPVA', valor: 120000, data: '2027-01-01' }));
  });

  it('meta perto: marco de 75% da Reserva', () => {
    const quase = onboarding({ ...ana, guardado: { valor: 900000, onde: 'cdb' } });
    expect(rodar(quase).avisos).toContainEqual(expect.objectContaining({ tipo: 'meta-perto', metaId: 'reserva', marco: 75 }));
  });

  it('sumiu: 7 dias sem abrir o app', () => {
    expect(tipos(rodar(ana, { ultimaAbertura: '2026-12-01' }))).toContain('sumiu');
    expect(tipos(rodar(ana, { ultimaAbertura: '2026-12-05' }))).not.toContain('sumiu');
  });

  const variosGatilhos = [...historico, ...tresMeses(20000, 'lazer'), gasto(25600, 'delivery', '2026-12-05'), gasto(17000, 'lazer', '2026-12-06'), gasto(90000, 'compras', '2026-12-06')];

  it('escolhe por prioridade: estourado antes de 80% e antes do ritmo', () => {
    expect(tipos(rodar(ana, { lancamentos: variosGatilhos })).slice(0, 3)).toEqual(['teto-estourado', 'teto-80', 'ritmo-diario']);
  });

  it('no máximo 3 Avisos novos por semana', () => {
    const comIpva = onboarding({ ...ana, anuais: [{ id: 'ipva', nome: 'IPVA', valor: 120000, mes: 1 }] });
    expect(rodar(comIpva, { lancamentos: variosGatilhos, ultimaAbertura: '2026-12-01' }).avisos).toHaveLength(3);
  });

  it('Avisos mostrados nos últimos 7 dias contam no limite', () => {
    const recentes = [{ chave: 'antigo-1', data: '2026-12-08' }, { chave: 'antigo-2', data: '2026-12-09' }];
    expect(rodar(ana, { lancamentos: variosGatilhos, avisosMostrados: recentes }).avisos).toHaveLength(1);
    const velhos = [{ chave: 'antigo-1', data: '2026-11-20' }, { chave: 'antigo-2', data: '2026-11-21' }];
    expect(rodar(ana, { lancamentos: variosGatilhos, avisosMostrados: velhos }).avisos).toHaveLength(3);
  });

  it('um Aviso já mostrado nesta semana continua aparecendo, sem contar de novo', () => {
    const lancamentos = [...historico, gasto(25600, 'delivery', '2026-12-05')];
    const primeiro = rodar(ana, { lancamentos }).avisos[0]!;
    const depois = rodar(ana, { lancamentos, avisosMostrados: [{ chave: primeiro.chave, data: '2026-12-09' }] });
    expect(depois.avisos.map((a) => a.chave)).toContain(primeiro.chave);
  });
});

describe('Dicas', () => {
  it('comida fora acima de 15% da renda: teto semanal, com a economia e o efeito na data da Meta', () => {
    const dica = rodar(ana, { lancamentos: tresMeses(70000, 'delivery') }).dicas.find((d) => d.tipo === 'comida-fora')!;
    expect(dica.economiaPorMes).toBe(21000);
    expect(dica.metaId).toBe('reserva');
    expect(dica.mesesAntes).toBeGreaterThanOrEqual(0);
  });

  it('dinheiro parado na poupança: a diferença para o rendimento conservador', () => {
    const p = PARAMETROS_PADRAO;
    const dica = rodar(ana).dicas.find((d) => d.tipo === 'dinheiro-parado')!;
    expect(dica.economiaPorMes).toBe(Math.round(500000 * (p.rendimentoMensalConservador - p.poupancaMensal)));
  });

  it('dívida no rotativo: trocar por juros menores', () => {
    expect(rodar(bruno).dicas.map((d) => d.tipo)).toContain('rotativo');
  });

  it('sem gatilho, sem dicas', () => {
    expect(rodar(carla).dicas).toEqual([]);
  });
});
