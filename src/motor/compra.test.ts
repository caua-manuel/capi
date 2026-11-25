import { describe, expect, it } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import type { Meta } from '../dominio/meta';
import { avaliarCompra, comprasParaLembrar } from './compra';
import { ana, entrada } from './teste/pessoas';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string): Lancamento => ({
  id: `c${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});
const tresMeses = (valor: number, categoriaId: string) => ['2026-09-10', '2026-10-10', '2026-11-10'].map((d) => gasto(valor, categoriaId, d));
// Ana com histórico: Teto de Compras online R$ 300 e de Mercado R$ 400.
const comTetos = entrada(ana, { lancamentos: [...tresMeses(30000, 'compras-online'), ...tresMeses(40000, 'mercado')] });
const viagem: Meta = { id: 'viagem', nome: 'Viagem', objetivo: 'viagem', valorAlvo: 600000, valorAtual: 0, dataAlvo: '2027-10', prioridade: 2, podeMexer: false };

describe('Posso comprar? à vista', () => {
  it('cabe no Teto da Categoria', () => {
    const r = avaliarCompra(comTetos, { preco: 10000, parcelas: 1, categoriaId: 'compras-online' });
    expect(r.valorNoMes).toBe(10000);
    expect(r.teto).toEqual({ restanteAntes: 30000, restanteDepois: 20000, cabe: true });
    expect(r.veredito).toBe('cabe');
  });

  it('não cabe no Teto, mas cabe no limite do mês: aperta', () => {
    const r = avaliarCompra(comTetos, { preco: 50000, parcelas: 1, categoriaId: 'compras-online' });
    expect(r.teto!.cabe).toBe(false);
    expect(r.limite.cabe).toBe(true);
    expect(r.veredito).toBe('aperta');
  });

  it('não cabe nem no limite do mês', () => {
    const r = avaliarCompra(comTetos, { preco: 500000, parcelas: 1, categoriaId: 'compras-online' });
    expect(r.limite).toMatchObject({ cabe: false });
    expect(r.veredito).toBe('nao-cabe');
  });

  it('sem Teto na Categoria, usa só o limite do mês', () => {
    const r = avaliarCompra(entrada(ana), { preco: 10000, parcelas: 1, categoriaId: 'lazer' });
    expect(r.teto).toBeNull();
    expect(r.limite).toEqual({ aindaAntes: 192000, aindaDepois: 182000, cabe: true });
  });
});

describe('Posso comprar? parcelado', () => {
  it('no mês entra só a primeira parcela e as outras viram compromisso', () => {
    const r = avaliarCompra(comTetos, { preco: 120000, parcelas: 12, categoriaId: 'compras-online' });
    expect(r.valorNoMes).toBe(10000);
    expect(r.parcelasFuturas).toEqual({ quantidade: 11, valor: 10000 });
  });

  it('parcela com centavos sobrando: a primeira leva a diferença', () => {
    const r = avaliarCompra(comTetos, { preco: 100000, parcelas: 3, categoriaId: 'compras-online' });
    expect(r.valorNoMes).toBe(33334);
    expect(r.parcelasFuturas).toEqual({ quantidade: 2, valor: 33333 });
  });
});

describe('Impacto na Previsão de fatura e nas Metas', () => {
  it('mostra quanto muda a Previsão de fatura', () => {
    const comCartao = { ...comTetos, cartao: { diaDeFechamento: 5, diaDeVencimento: 15 } };
    const r = avaliarCompra(comCartao, { preco: 120000, parcelas: 12, categoriaId: 'compras-online' });
    expect(r.previsao).toEqual({ antes: 0, depois: 10000 });
  });

  it('sem cartão configurado não há impacto na Previsão', () => {
    expect(avaliarCompra(comTetos, { preco: 10000, parcelas: 1, categoriaId: 'compras-online' }).previsao).toBeNull();
  });

  it('compra grande atrasa as Metas e diz em quantos meses', () => {
    const r = avaliarCompra({ ...comTetos, metas: [viagem] }, { preco: 600000, parcelas: 1, categoriaId: 'compras-online' });
    const reserva = r.metas.find((m) => m.id === 'reserva')!;
    expect(reserva.mesesDeAtraso).toBeGreaterThanOrEqual(1);
    expect(reserva.dataDepois! > reserva.dataAntes!).toBe(true);
  });

  it('compra pequena não atrasa nada', () => {
    const r = avaliarCompra(comTetos, { preco: 1000, parcelas: 1, categoriaId: 'compras-online' });
    expect(r.metas.every((m) => m.mesesDeAtraso === 0)).toBe(true);
  });
});

describe('Regra das 24 horas', () => {
  const pendentes = [
    { id: 'tenis', descricao: 'Tênis', preco: 40000, parcelas: 1, categoriaId: 'compras', guardadaEm: '2026-12-09T10:00:00Z' },
    { id: 'fone', descricao: 'Fone', preco: 30000, parcelas: 1, categoriaId: 'compras', guardadaEm: '2026-12-10T08:00:00Z' },
  ];

  it('lembra na próxima abertura depois de 24 horas', () => {
    expect(comprasParaLembrar(pendentes, '2026-12-10T11:00:00Z').map((p) => p.id)).toEqual(['tenis']);
  });

  it('antes de 24 horas não lembra', () => {
    expect(comprasParaLembrar(pendentes, '2026-12-10T09:00:00Z')).toEqual([]);
  });
});
