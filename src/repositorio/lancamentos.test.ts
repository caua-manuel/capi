import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { fecharBanco } from './banco';
import { apagarComSeguintes, apagarLancamento, listarLancamentosDoMes, restaurarLancamentos, salvarLancamento } from './lancamentos';
import { gravarRegra, lerRegras } from './regras';
import type { Lancamento } from '../dominio/lancamento';

const lancamento = (id: string, data: string): Lancamento => ({
  id, valor: 4200, loja: 'Ifood', categoriaId: 'delivery', data, origem: 'manual', criadoEm: `${data}T12:00:00Z`,
});

describe('Repositório de Lançamentos', () => {
  afterEach(fecharBanco);

  it('lista só os Lançamentos do mês, pela data da compra', async () => {
    await salvarLancamento(lancamento('a', '2026-11-30'));
    await salvarLancamento(lancamento('b', '2026-12-01'));
    expect((await listarLancamentosDoMes('2026-12')).map((l) => l.id)).toEqual(['b']);
  });

  it('edita e apaga um Lançamento', async () => {
    await salvarLancamento({ ...lancamento('b', '2026-12-01'), valor: 5000 });
    expect((await listarLancamentosDoMes('2026-12'))[0]?.valor).toBe(5000);
    await apagarLancamento('b');
    expect(await listarLancamentosDoMes('2026-12')).toEqual([]);
  });

  it('grava a Regra de estabelecimento pela Loja normalizada', async () => {
    await gravarRegra('  Padaria São José ', 'comida-fora');
    expect(await lerRegras()).toMatchObject({ 'padaria sao jose': 'comida-fora' });
  });
});

describe('Desfazer ao apagar', () => {
  afterEach(fecharBanco);

  it('restaura o Lançamento apagado igual ao que era', async () => {
    const original = { ...lancamento('d1', '2027-03-05'), idDaLinha: 'linha-9', origem: 'importacao' as const };
    await salvarLancamento(original);
    const apagados = await apagarComSeguintes('d1');
    expect(await listarLancamentosDoMes('2027-03')).toEqual([]);
    await restaurarLancamentos(apagados);
    expect(await listarLancamentosDoMes('2027-03')).toEqual([original]);
  });

  it('apagar uma Parcela leva as seguintes, e desfazer traz todas de volta', async () => {
    const parcela = (id: string, data: string, atual: number): Lancamento => ({ ...lancamento(id, data), compraId: 'c1', parcela: { atual, total: 3 } });
    const todas = [parcela('c1', '2027-04-10', 1), parcela('p2', '2027-05-10', 2), parcela('p3', '2027-06-10', 3)];
    for (const l of todas) await salvarLancamento(l);
    const apagados = await apagarComSeguintes('p2');
    expect(apagados.map((l) => l.id).sort()).toEqual(['p2', 'p3']);
    expect((await listarLancamentosDoMes('2027-04')).map((l) => l.id)).toEqual(['c1']);
    await restaurarLancamentos(apagados);
    expect((await listarLancamentosDoMes('2027-06')).map((l) => l.id)).toEqual(['p3']);
  });

  it('apagar um id que não existe não apaga nada', async () => {
    expect(await apagarComSeguintes('nao-existe')).toEqual([]);
  });
});
