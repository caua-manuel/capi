import type { Lancamento } from '../dominio/lancamento';
import { abrirBanco } from './banco';

export async function salvarLancamento(lancamento: Lancamento): Promise<void> {
  const db = await abrirBanco();
  await db.put('lancamentos', lancamento);
}

export async function apagarLancamento(id: string): Promise<void> {
  const db = await abrirBanco();
  await db.delete('lancamentos', id);
}

/** Lançamentos a partir de um mês (AAAA-MM), pela data da compra, para o Motor. */
export async function listarLancamentosDesde(mes: string): Promise<Lancamento[]> {
  const db = await abrirBanco();
  return db.getAllFromIndex('lancamentos', 'por-data', IDBKeyRange.lowerBound(`${mes}-01`));
}

/** Lançamentos de um mês (AAAA-MM), pela data da compra, do mais novo para o mais antigo. */
export async function listarLancamentosDoMes(mes: string): Promise<Lancamento[]> {
  const db = await abrirBanco();
  const lista = await db.getAllFromIndex('lancamentos', 'por-data', IDBKeyRange.bound(`${mes}-01`, `${mes}-31`));
  return lista.sort((a, b) => (b.data + b.criadoEm).localeCompare(a.data + a.criadoEm));
}

/**
 * Apaga um Lançamento e, se for Parcela de uma compra parcelada, as Parcelas seguintes.
 * Devolve tudo o que apagou, para dar para desfazer.
 */
export async function apagarComSeguintes(id: string): Promise<Lancamento[]> {
  const db = await abrirBanco();
  const alvo = await db.get('lancamentos', id);
  if (!alvo) return [];
  const apagados = [alvo];
  if (alvo.compraId) {
    const todos = await db.getAllFromIndex('lancamentos', 'por-data', IDBKeyRange.lowerBound(alvo.data));
    apagados.push(...todos.filter((l) => l.compraId === alvo.compraId && l.id !== alvo.id));
  }
  for (const l of apagados) await db.delete('lancamentos', l.id);
  return apagados;
}

/** Desfazer: devolve os Lançamentos apagados, do jeito que eram. */
export async function restaurarLancamentos(lista: readonly Lancamento[]): Promise<void> {
  const db = await abrirBanco();
  for (const l of lista) await db.put('lancamentos', l);
}
