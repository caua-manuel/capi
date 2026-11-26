import type { Lancamento } from '../dominio/lancamento';
import type { PendenteDoAtalho } from '../dominio/pendente';
import { normalizar } from '../leitor/normalizar';
import { abrirBanco } from './banco';

export async function listarPendentesDoAtalho(): Promise<PendenteDoAtalho[]> {
  const db = await abrirBanco();
  const fila = await db.getAllFromIndex('pendentes', 'por-ordem');
  return fila.map(({ id, loja, valor }) => ({ id, loja, valor }));
}

export async function gravarPendentesDoAtalho(pendentes: readonly PendenteDoAtalho[]): Promise<void> {
  if (pendentes.length === 0) return;
  const db = await abrirBanco();
  const tx = db.transaction(['pendentes', 'pendentesResolvidos'], 'readwrite', { durability: 'strict' });
  await Promise.all([tx.done, (async () => {
    const fila = tx.objectStore('pendentes');
    const resolvidos = tx.objectStore('pendentesResolvidos');
    const ultimo = await fila.index('por-ordem').openKeyCursor(null, 'prev');
    let ordem = ultimo?.key ?? 0;
    for (const pendente of pendentes) {
      if (await fila.getKey(pendente.id) === undefined && await resolvidos.getKey(pendente.id) === undefined) {
        await fila.add({ ...pendente, ordem: ++ordem });
      }
    }
    const vencidos = await resolvidos.index('por-expiracao').getAllKeys(IDBKeyRange.upperBound(Date.now()));
    for (const id of vencidos) await resolvidos.delete(id);
  })()]);
}

/** Sem valor ou Loja. Evita reabrir o Pendente se a confirmação da ponte ainda estiver em trânsito. */
function resolvido(id: string) {
  return { id, expirarEm: Date.now() + 48 * 60 * 60 * 1000 };
}

export async function descartarPendenteDoAtalho(id: string): Promise<void> {
  const db = await abrirBanco();
  const tx = db.transaction(['pendentes', 'pendentesResolvidos'], 'readwrite');
  await Promise.all([
    tx.objectStore('pendentes').delete(id),
    tx.objectStore('pendentesResolvidos').put(resolvido(id)),
    tx.done,
  ]);
}

export async function salvarPendenteComoLancamento(id: string, lancamento: Lancamento, demais: readonly Lancamento[]): Promise<void> {
  const db = await abrirBanco();
  const tx = db.transaction(['pendentes', 'pendentesResolvidos', 'lancamentos', 'regras'], 'readwrite');
  await Promise.all([tx.done, (async () => {
    const pendentes = tx.objectStore('pendentes');
    if (await pendentes.getKey(id) === undefined) return;
    const lancamentos = tx.objectStore('lancamentos');
    for (const parcela of [lancamento, ...demais]) await lancamentos.add(parcela);
    const loja = normalizar(lancamento.loja);
    if (loja) await tx.objectStore('regras').put(lancamento.categoriaId, loja);
    await tx.objectStore('pendentesResolvidos').put(resolvido(id));
    await pendentes.delete(id);
  })()]);
}
