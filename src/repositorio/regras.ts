import type { RegrasDeEstabelecimento } from '../leitor/leitor';
import { normalizar } from '../leitor/normalizar';
import { abrirBanco } from './banco';

export async function lerRegras(): Promise<RegrasDeEstabelecimento> {
  const db = await abrirBanco();
  const tx = db.transaction('regras');
  const regras: RegrasDeEstabelecimento = {};
  for await (const cursor of tx.store) regras[cursor.key] = cursor.value;
  return regras;
}

/** A Categoria escolhida para uma Loja passa a valer sempre. */
export async function gravarRegra(loja: string, categoriaId: string): Promise<void> {
  const chave = normalizar(loja);
  if (!chave) return;
  const db = await abrirBanco();
  await db.put('regras', categoriaId, chave);
}
