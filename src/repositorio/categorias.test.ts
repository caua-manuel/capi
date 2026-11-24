import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { criarCategoriaPropria } from '../dominio/categorias';
import { fecharBanco } from './banco';
import { apagarCategoriaPropria, gravarEscondidas, lerEscondidas, listarCategoriasProprias, salvarCategoriaPropria } from './categorias';
import { listarLancamentosDoMes, salvarLancamento } from './lancamentos';
import { gravarRegra, lerRegras } from './regras';

describe('Repositório de Categorias', () => {
  afterEach(fecharBanco);

  it('cria e renomeia uma Categoria própria', async () => {
    await salvarCategoriaPropria(criarCategoriaPropria('pet', 'Pet', 'essencial'));
    await salvarCategoriaPropria(criarCategoriaPropria('pet', 'Bichos', 'essencial'));
    expect((await listarCategoriasProprias()).map((c) => c.nome)).toEqual(['Bichos']);
  });

  it('apagar uma Categoria própria manda os Lançamentos dela para Outros e tira as Regras', async () => {
    await salvarLancamento({ id: 'l1', valor: 3000, loja: 'Petz', categoriaId: 'pet', data: '2026-12-02', origem: 'manual', criadoEm: '2026-12-02T10:00:00Z' });
    await gravarRegra('Petz', 'pet');
    await apagarCategoriaPropria('pet');
    expect(await listarCategoriasProprias()).toEqual([]);
    expect((await listarLancamentosDoMes('2026-12'))[0]?.categoriaId).toBe('outros');
    expect(await lerRegras()).not.toHaveProperty('petz');
  });

  it('não deixa gravar Outros como escondida', async () => {
    await gravarEscondidas(['delivery', 'outros']);
    expect(await lerEscondidas()).toEqual(['delivery']);
  });
});
