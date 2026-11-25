import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// O Repositório é a única parte do app que lê e grava dados (IndexedDB, ADR 0002).

export interface EsquemaCapi extends DBSchema {
  ajustes: {
    key: string;
    value: unknown;
  };
}

export const NOME_DO_BANCO = 'capi';
export const VERSAO_DO_BANCO = 1;

let bancoAberto: Promise<IDBPDatabase<EsquemaCapi>> | null = null;

export function abrirBanco(): Promise<IDBPDatabase<EsquemaCapi>> {
  bancoAberto ??= openDB<EsquemaCapi>(NOME_DO_BANCO, VERSAO_DO_BANCO, {
    upgrade(db, versaoAntiga) {
      // Cada versão nova acrescenta seus stores aqui, sem apagar os antigos.
      if (versaoAntiga < 1) {
        db.createObjectStore('ajustes');
      }
    },
  });
  return bancoAberto;
}

/** Só para testes: esquece a conexão aberta. */
export async function fecharBanco(): Promise<void> {
  if (bancoAberto) (await bancoAberto).close();
  bancoAberto = null;
}
