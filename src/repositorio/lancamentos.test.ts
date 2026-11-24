import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { fecharBanco } from './banco';
import { apagarLancamento, listarLancamentosDoMes, salvarLancamento } from './lancamentos';
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
