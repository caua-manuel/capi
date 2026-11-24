import { ID_OUTROS, type Categoria } from '../dominio/categorias';
import { lerAjuste, gravarAjuste } from './ajustes';
import { abrirBanco } from './banco';

const CHAVE_ESCONDIDAS = 'categorias-escondidas';

export async function listarCategoriasProprias(): Promise<Categoria[]> {
  const db = await abrirBanco();
  return (await db.getAll('categorias')).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function salvarCategoriaPropria(categoria: Categoria): Promise<void> {
  if (categoria.padrao) throw new Error('As Categorias padrão não são gravadas, só escondidas.');
  const db = await abrirBanco();
  await db.put('categorias', categoria);
}

/** Apaga uma Categoria própria. Os Lançamentos dela vão para Outros e as Regras dela deixam de valer. */
export async function apagarCategoriaPropria(id: string): Promise<void> {
  const db = await abrirBanco();
  const tx = db.transaction(['categorias', 'lancamentos', 'regras'], 'readwrite');
  const categoria = await tx.objectStore('categorias').get(id);
  if (!categoria || categoria.padrao) return tx.done;
  for (const lancamento of await tx.objectStore('lancamentos').index('por-categoria').getAll(id)) {
    await tx.objectStore('lancamentos').put({ ...lancamento, categoriaId: ID_OUTROS });
  }
  for await (const cursor of tx.objectStore('regras')) {
    if (cursor.value === id) await cursor.delete();
  }
  await tx.objectStore('categorias').delete(id);
  await tx.done;
}

export async function lerEscondidas(): Promise<string[]> {
  return (await lerAjuste<string[]>(CHAVE_ESCONDIDAS)) ?? [];
}

export async function gravarEscondidas(ids: string[]): Promise<void> {
  await gravarAjuste(CHAVE_ESCONDIDAS, ids.filter((id) => id !== ID_OUTROS));
}
