import { afterEach, expect, it, vi } from 'vitest';
import { interpretarPendentes } from './pushDoAtalho';

afterEach(() => vi.unstubAllGlobals());

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
  vi.stubEnv('VITE_PONTE_APPLE_PAY_URL', 'https://ponte.example');
  vi.resetModules();
  const { buscarPendentesDoAtalho: buscar } = await import('./pushDoAtalho');
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Sem rede')).mockResolvedValueOnce(Response.json([
    { id: 'pendente', valor: '42,50', loja: 'Padaria' },
  ]));
  vi.stubGlobal('fetch', fetch);
  try {
    const primeira = buscar('codigo-do-teste');
    expect(buscar('codigo-do-teste')).toBe(primeira);
    await expect(primeira).rejects.toThrow();
    await expect(buscar('codigo-do-teste')).resolves.toEqual([{ id: 'pendente', valor: 4250, loja: 'Padaria' }]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(new URL('https://ponte.example/pendentes'), expect.objectContaining({
      method: 'GET', headers: { Authorization: 'Bearer codigo-do-teste' }, cache: 'no-store',
    }));
  } finally {
    vi.unstubAllEnvs();
  }
});
