import type { Fatura } from '../dominio/fatura';
import { abrirBanco } from './banco';

export async function listarFaturas(): Promise<Fatura[]> {
  const db = await abrirBanco();
  return (await db.getAll('faturas')).sort((a, b) => a.fechamento.localeCompare(b.fechamento));
}

/** Grava a Fatura pelo id: importar a mesma Fatura de novo substitui, sem duplicar. */
export async function salvarFatura(fatura: Fatura): Promise<void> {
  const db = await abrirBanco();
  await db.put('faturas', fatura);
}
