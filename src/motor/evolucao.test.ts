import { describe, expect, it } from 'vitest';
import { CATEGORIAS_PADRAO } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import { evolucaoDaFatura } from './evolucao';

let seq = 0;
const gasto = (valor: number, categoriaId: string, data: string, extra: Partial<Lancamento> = {}): Lancamento => ({
  id: `e${++seq}`, valor, loja: 'Loja', categoriaId, data, origem: 'manual', criadoEm: `${data}T12:00:00Z`, ...extra,
});
const evoluir = (lancamentos: Lancamento[], hoje = '2026-12-10') => evolucaoDaFatura({ hoje, lancamentos, categorias: CATEGORIAS_PADRAO });

describe('Evolução da Fatura mês a mês', () => {
  it('mostra os últimos 6 meses, do mais antigo ao mês de hoje', () => {
    expect(evoluir([]).meses.map((m) => m.mes)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
  });

  it('separa cada mês por Grupo, pela data da compra', () => {
    const e = evoluir([
      gasto(50000, 'mercado', '2026-11-03'), gasto(20000, 'delivery', '2026-11-20'), gasto(8000, 'lazer', '2026-11-21'),
      gasto(10000, 'mercado', '2026-12-02'),
    ]);
    const nov = e.meses.find((m) => m.mes === '2026-11')!;
    expect(nov.porGrupo).toEqual({ essencial: 50000, 'estilo-de-vida': 28000, 'guardar-quitar': 0 });
    expect(nov.total).toBe(78000);
    expect(e.meses.find((m) => m.mes === '2026-12')!.total).toBe(10000);
  });

  it('só conta o que é pago no cartão, como a Fatura (Pix para pessoas fica de fora)', () => {
    const e = evoluir([gasto(30000, 'mercado', '2026-11-05'), gasto(9000, 'pix-pessoas', '2026-11-06')]);
    expect(e.meses.find((m) => m.mes === '2026-11')!.total).toBe(30000);
  });

  it('Categoria desconhecida conta como Estilo de vida', () => {
    const e = evoluir([gasto(1000, 'apagada', '2026-11-05')]);
    expect(e.meses.find((m) => m.mes === '2026-11')!.porGrupo['estilo-de-vida']).toBe(1000);
  });

  it('o mês de hoje está em andamento e os anteriores estão fechados', () => {
    const e = evoluir([]);
    expect(e.meses.map((m) => m.emAndamento)).toEqual([false, false, false, false, false, true]);
  });

  it('destaca quando a Fatura cresce 3 meses seguidos, olhando só meses fechados', () => {
    const e = evoluir([
      gasto(100000, 'mercado', '2026-08-10'), gasto(120000, 'mercado', '2026-09-10'),
      gasto(150000, 'mercado', '2026-10-10'), gasto(190000, 'mercado', '2026-11-10'),
      gasto(5000, 'mercado', '2026-12-02'), // mês em andamento não derruba nem conta
    ]);
    expect(e.altaSeguida).toEqual({ meses: 3, de: '2026-08', ate: '2026-11', aumento: 90000 });
  });

  it('crescer só 2 meses não destaca', () => {
    const e = evoluir([gasto(100000, 'mercado', '2026-09-10'), gasto(120000, 'mercado', '2026-10-10'), gasto(150000, 'mercado', '2026-11-10')]);
    expect(e.altaSeguida).toBeNull();
  });

  it('uma queda no meio zera a contagem', () => {
    const e = evoluir([
      gasto(100000, 'mercado', '2026-08-10'), gasto(120000, 'mercado', '2026-09-10'), gasto(90000, 'mercado', '2026-10-10'), gasto(110000, 'mercado', '2026-11-10'),
    ]);
    expect(e.altaSeguida).toBeNull();
  });

  it('conta a alta mais longa até o último mês fechado, mesmo com mais de 3', () => {
    const e = evoluir([
      gasto(100000, 'mercado', '2026-07-10'), gasto(110000, 'mercado', '2026-08-10'), gasto(120000, 'mercado', '2026-09-10'),
      gasto(130000, 'mercado', '2026-10-10'), gasto(140000, 'mercado', '2026-11-10'),
    ]);
    expect(e.altaSeguida).toMatchObject({ meses: 4, de: '2026-07', ate: '2026-11', aumento: 40000 });
  });

  it('mês sem gasto não conta como alta', () => {
    expect(evoluir([gasto(100000, 'mercado', '2026-11-10')]).altaSeguida).toBeNull();
  });
});
