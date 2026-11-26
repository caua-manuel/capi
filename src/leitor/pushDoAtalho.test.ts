import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Lancamento } from '../dominio/lancamento';
import { interpretarPendentes } from './pushDoAtalho';

beforeEach(() => {
  vi.stubEnv('VITE_PONTE_APPLE_PAY_URL', 'https://ponte.example');
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

afterEach(async () => {
  await (await import('../repositorio/banco')).fecharBanco();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const primeiro = { id: 'z-primeiro', valor: '42,50', loja: 'Padaria' };
const segundo = { id: 'a-segundo', valor: '9,07', loja: 'Mercado' };

it('mantém a ordem dos Pendentes e converte o valor em centavos', () => {
  expect(interpretarPendentes([
    { id: 'primeiro', valor: '1.234,50', loja: '  Mercado 2x  ' },
    { id: 'segundo', valor: '9,07', loja: '99 Food' },
    { id: 'primeiro', valor: '7,00', loja: 'Repetido' },
    { id: 'inválido', valor: 'sem valor', loja: 'Mercado' },
  ])).toEqual([
    { id: 'primeiro', valor: 123450, loja: 'Mercado 2x' },
    { id: 'segundo', valor: 907, loja: '99 Food' },
  ]);
});

it('ignora respostas que não são uma lista de Pendentes', () => {
  expect(interpretarPendentes({ id: 'avulso', valor: '7,00', loja: 'Mercado' })).toEqual([]);
});

it('permite tentar novamente depois de uma busca sem rede', async () => {
  const { buscarPendentesDoAtalho: buscar } = await import('./pushDoAtalho');
  const { listarPendentesDoAtalho: listar } = await import('../repositorio/pendentes');
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Sem rede'))
    .mockResolvedValueOnce(Response.json([primeiro]))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  const primeira = buscar('codigo-do-teste');
  expect(buscar('codigo-do-teste')).toBe(primeira);
  await expect(primeira).rejects.toThrow();
  await buscar('codigo-do-teste');
  expect(await listar()).toEqual([{ id: primeiro.id, valor: 4250, loja: primeiro.loja }]);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('reabre a fila sem rede e acrescenta novos Pendentes em ordem de chegada sem repetir ids', async () => {
  const { buscarPendentesDoAtalho: buscar } = await import('./pushDoAtalho');
  const fetch = vi.fn().mockResolvedValueOnce(Response.json([primeiro]))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json([primeiro, segundo]))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  await buscar('codigo-do-teste');
  await (await import('../repositorio/banco')).fecharBanco();
  vi.resetModules();

  const { listarPendentesDoAtalho: listar } = await import('../repositorio/pendentes');
  expect((await listar()).map(({ id }) => id)).toEqual([primeiro.id]);
  expect(fetch).toHaveBeenCalledTimes(2);
  await (await import('./pushDoAtalho')).buscarPendentesDoAtalho('codigo-do-teste');
  expect((await listar()).map(({ id }) => id)).toEqual([primeiro.id, segundo.id]);
});

it('salva só o Pendente escolhido e descarta o outro sem reabrir ids reenviados', async () => {
  const { buscarPendentesDoAtalho: buscar } = await import('./pushDoAtalho');
  const { listarPendentesDoAtalho: listar, salvarPendenteComoLancamento, descartarPendenteDoAtalho } = await import('../repositorio/pendentes');
  const { listarLancamentosDoMes } = await import('../repositorio/lancamentos');
  vi.stubGlobal('fetch', vi.fn(async (url: URL) => url.pathname.endsWith('/entrega')
    ? Response.json([primeiro, segundo])
    : new Response(null, { status: 503 })));
  const lancamento: Lancamento = {
    id: 'gasto', categoriaId: 'mercado', origem: 'applepay', valor: 4250, loja: 'Padaria',
    data: '2026-11-26', criadoEm: '2026-11-26T12:00:00Z',
  };

  await buscar('codigo-do-teste');
  await Promise.all([
    salvarPendenteComoLancamento(primeiro.id, lancamento, []),
    salvarPendenteComoLancamento(primeiro.id, { ...lancamento, id: 'repetido' }, []),
  ]);
  expect(await listarLancamentosDoMes('2026-11')).toEqual([lancamento]);
  expect((await listar()).map(({ id }) => id)).toEqual([segundo.id]);
  await descartarPendenteDoAtalho(segundo.id);
  await buscar('codigo-do-teste');
  expect(await listar()).toEqual([]);
  expect(await listarLancamentosDoMes('2026-11')).toEqual([lancamento]);
});

it('retém o lote se a transação abortar e só confirma a entrega depois de gravar', async () => {
  const { buscarPendentesDoAtalho: buscar } = await import('./pushDoAtalho');
  const { listarPendentesDoAtalho: listar } = await import('../repositorio/pendentes');
  const fetch = vi.fn().mockResolvedValueOnce(Response.json([primeiro, segundo]))
    .mockImplementationOnce(async () => {
      expect((await listar()).map(({ id }) => id)).toEqual([primeiro.id, segundo.id]);
      return new Response(null, { status: 204 });
    });
  vi.stubGlobal('fetch', fetch);
  const adicionar = IDBObjectStore.prototype.add;
  vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementationOnce(function (this: IDBObjectStore, valor) {
    const requisicao = adicionar.call(this, valor);
    this.transaction.abort();
    return requisicao;
  });

  await expect(buscar('codigo-do-teste')).rejects.toThrow();
  expect(await listar()).toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(1);
  await buscar('codigo-do-teste');
  expect(fetch).toHaveBeenCalledTimes(2);
  await expect(fetch.mock.results[1]?.value).resolves.toMatchObject({ status: 204 });
  expect(fetch).toHaveBeenLastCalledWith(new URL('https://ponte.example/pendentes/confirmar'), expect.objectContaining({
    method: 'POST', body: JSON.stringify([primeiro.id, segundo.id]),
  }));
});
