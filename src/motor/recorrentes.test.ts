import { describe, expect, it } from 'vitest';
import type { Fatura, LinhaDeFatura } from '../dominio/fatura';
import { detectarRecorrentes } from './recorrentes';
import { PARAMETROS_PADRAO } from './parametros';
import { ana, rodar } from './teste/pessoas';

// Faturas fictícias. Nenhum dado real.
let seq = 0;
const linha = (data: string, loja: string, valor: number, extra: Partial<LinhaDeFatura> = {}): LinhaDeFatura => ({
  id: `l${++seq}`, data, loja, valor, tipo: 'compra', ...extra,
});
const fatura = (fechamento: string, linhas: LinhaDeFatura[]): Fatura => ({ id: fechamento, fechamento, vencimento: fechamento, linhas });

const setembro = fatura('2026-10-05', [linha('2026-09-12', 'NETFLIX.COM', 5590), linha('2026-09-20', 'PADARIA DO BAIRRO', 1830)]);
const outubro = fatura('2026-11-05', [linha('2026-10-13', 'NETFLIX.COM', 5590), linha('2026-10-22', 'MERCADO CENTRAL', 23400)]);
const novembro = fatura('2026-12-05', [linha('2026-11-12', 'Netflix.com', 5590)]);

const iof = PARAMETROS_PADRAO.iofInternacional;

describe('Detecção de Recorrentes', () => {
  it('a mesma Loja em 2 ou mais Faturas, com valor e dia parecidos, é Recorrente', () => {
    const r = detectarRecorrentes([setembro, outubro, novembro], iof);
    expect(r.map((x) => x.loja)).toEqual(['Netflix.com']);
    expect(r[0]!.faturas).toBe(3);
  });

  it('uma Loja que aparece em uma Fatura só não é Recorrente', () => {
    expect(detectarRecorrentes([setembro], iof)).toEqual([]);
  });

  it('valor fora de ±10% não é a mesma cobrança', () => {
    const a = fatura('2026-10-05', [linha('2026-09-10', 'POSTO AVENIDA', 10000)]);
    const b = fatura('2026-11-05', [linha('2026-10-10', 'POSTO AVENIDA', 15000)]);
    expect(detectarRecorrentes([a, b], iof)).toEqual([]);
  });

  it('dia fora de ±3 não é a mesma cobrança', () => {
    const a = fatura('2026-10-05', [linha('2026-09-02', 'ACADEMIA X', 9990)]);
    const b = fatura('2026-11-05', [linha('2026-10-20', 'ACADEMIA X', 9990)]);
    expect(detectarRecorrentes([a, b], iof)).toEqual([]);
  });

  it('parcelas não contam como Recorrente', () => {
    const a = fatura('2026-10-05', [linha('2026-08-10', 'LOJA DE MOVEIS', 20000, { parcela: { atual: 2, total: 10 } })]);
    const b = fatura('2026-11-05', [linha('2026-08-10', 'LOJA DE MOVEIS', 20000, { parcela: { atual: 3, total: 10 } })]);
    expect(detectarRecorrentes([a, b], iof)).toEqual([]);
  });

  it('mostra o custo anual de cada Recorrente', () => {
    expect(detectarRecorrentes([setembro, outubro], iof)[0]!.custoAnual).toBe(5590 * 12);
  });
});

describe('Destaques dos Recorrentes', () => {
  it('cobrança em dólar soma o IOF da tabela de Parâmetros no custo anual', () => {
    const a = fatura('2026-10-05', [linha('2026-09-05', 'OPENAI CHATGPT', 10000, { emDolar: true })]);
    const b = fatura('2026-11-05', [linha('2026-10-05', 'OPENAI CHATGPT', 10200, { emDolar: true })]);
    const [r] = detectarRecorrentes([a, b], iof);
    expect(r!.emDolar).toBe(true);
    expect(r!.custoAnual).toBe(Math.round(10200 * (1 + iof) * 12));
  });

  it('aumento de preço entre as duas últimas Faturas', () => {
    const a = fatura('2026-10-05', [linha('2026-09-12', 'SPOTIFY', 2190)]);
    const b = fatura('2026-11-05', [linha('2026-10-12', 'SPOTIFY', 2390)]);
    expect(detectarRecorrentes([a, b], iof)[0]).toMatchObject({ aumento: true, valor: 2390, valorAnterior: 2190 });
  });

  it('cobrança duplicada: o mesmo serviço 2 vezes na última Fatura', () => {
    const a = fatura('2026-10-05', [linha('2026-09-12', 'YOUTUBE PREMIUM', 2690)]);
    const b = fatura('2026-11-05', [linha('2026-10-12', 'YOUTUBE PREMIUM', 2690), linha('2026-10-14', 'YOUTUBE PREMIUM', 2690)]);
    expect(detectarRecorrentes([a, b], iof)[0]!.duplicada).toBe(true);
  });

  it('nome genérico que o Usuário precisa identificar', () => {
    const a = fatura('2026-10-05', [linha('2026-09-08', 'GOOGLE', 3500)]);
    const b = fatura('2026-11-05', [linha('2026-10-08', 'GOOGLE', 3500)]);
    expect(detectarRecorrentes([a, b], iof)[0]!.nomeGenerico).toBe(true);
    expect(detectarRecorrentes([setembro, outubro], iof)[0]!.nomeGenerico).toBe(false);
  });
});

describe('Recorrentes na saída do Motor', () => {
  it('vêm das Faturas da entrada', () => {
    expect(rodar(ana, { faturas: [setembro, outubro] }).recorrentes.map((r) => r.loja)).toEqual(['NETFLIX.COM']);
  });

  it('sem Faturas não há Recorrentes', () => {
    expect(rodar(ana).recorrentes).toEqual([]);
  });
});
