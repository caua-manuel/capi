import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Lancamento } from '../dominio/lancamento';

// O Repositório é a única parte do app que lê e grava dados (IndexedDB, ADR 0002).

export interface EsquemaCapi extends DBSchema {
  ajustes: {
    key: string;
    value: unknown;
  };
  lancamentos: {
    key: string;
    value: Lancamento;
    indexes: { 'por-data': string };
  };
  /** Regras de estabelecimento: Loja normalizada → id da Categoria. */
  regras: {
    key: string;
    value: string;
  };
}

export const NOME_DO_BANCO = 'capi';
export const VERSAO_DO_BANCO = 2;

let bancoAberto: Promise<IDBPDatabase<EsquemaCapi>> | null = null;

export function abrirBanco(): Promise<IDBPDatabase<EsquemaCapi>> {
  bancoAberto ??= openDB<EsquemaCapi>(NOME_DO_BANCO, VERSAO_DO_BANCO, {
    upgrade(db, versaoAntiga) {
      // Cada versão nova acrescenta seus stores aqui, sem apagar os antigos.
      if (versaoAntiga < 1) {
        db.createObjectStore('ajustes');
      }
      if (versaoAntiga < 2) {
        const lancamentos = db.createObjectStore('lancamentos', { keyPath: 'id' });
        lancamentos.createIndex('por-data', 'data');
        db.createObjectStore('regras');
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
