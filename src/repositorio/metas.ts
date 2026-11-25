import type { Meta } from '../dominio/meta';
import { abrirBanco } from './banco';

export async function listarMetas(): Promise<Meta[]> {
  const db = await abrirBanco();
  return db.getAll('metas');
}

export async function salvarMeta(meta: Meta): Promise<void> {
  const db = await abrirBanco();
  await db.put('metas', meta);
}

export async function apagarMeta(id: string): Promise<void> {
  const db = await abrirBanco();
  await db.delete('metas', id);
}
