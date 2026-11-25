import { abrirBanco } from './banco';

export async function gravarAjuste<T>(chave: string, valor: T): Promise<void> {
  const db = await abrirBanco();
  await db.put('ajustes', valor, chave);
}

export async function lerAjuste<T>(chave: string): Promise<T | undefined> {
  const db = await abrirBanco();
  return (await db.get('ajustes', chave)) as T | undefined;
}
