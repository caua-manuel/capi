import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { gravarAjuste, lerAjuste } from './ajustes';
import { fecharBanco } from './banco';

describe('Repositório de ajustes', () => {
  afterEach(fecharBanco);

  it('grava e lê um registro de teste no IndexedDB', async () => {
    await gravarAjuste('teste', { ola: 'Capi' });
    expect(await lerAjuste('teste')).toEqual({ ola: 'Capi' });
  });

  it('devolve undefined para uma chave que não existe', async () => {
    expect(await lerAjuste('nao-existe')).toBeUndefined();
  });
});
