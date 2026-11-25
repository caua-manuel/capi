import type { Fixo } from '../dominio/fixo';
import { abrirBanco } from './banco';

export async function listarFixos(): Promise<Fixo[]> {
  const db = await abrirBanco();
  return db.getAll('fixos');
}

export async function salvarFixo(fixo: Fixo): Promise<void> {
  const db = await abrirBanco();
  await db.put('fixos', fixo);
}

export async function salvarFixos(fixos: readonly Fixo[]): Promise<void> {
  const db = await abrirBanco();
  const tx = db.transaction('fixos', 'readwrite');
  await Promise.all([...fixos.map((f) => tx.store.put(f)), tx.done]);
}
