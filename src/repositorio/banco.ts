import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Categoria } from '../dominio/categorias';
import type { Fixo } from '../dominio/fixo';
import type { Meta } from '../dominio/meta';
import type { Fatura } from '../dominio/fatura';
import type { Lancamento } from '../dominio/lancamento';
import type { PendenteDoAtalho } from '../dominio/pendente';

// O Repositório é a única parte do app que lê e grava dados (IndexedDB, ADR 0002).

export interface EsquemaCapi extends DBSchema {
  ajustes: {
    key: string;
    value: unknown;
  };
  lancamentos: {
    key: string;
    value: Lancamento;
    indexes: { 'por-data': string; 'por-categoria': string };
  };
  /** Regras de estabelecimento: Loja normalizada → id da Categoria. */
  regras: {
    key: string;
    value: string;
  };
  /** Só as Categorias próprias; as 17 padrão vêm do código. */
  categorias: {
    key: string;
    value: Categoria;
  };
  fixos: {
    key: string;
    value: Fixo;
  };
  metas: {
    key: string;
    value: Meta;
  };
  /** Faturas importadas: só as linhas lidas, nunca o texto colado. */
  faturas: {
    key: string;
    value: Fatura;
  };
  pendentes: {
    key: string;
    value: PendenteDoAtalho & { ordem: number };
    indexes: { 'por-ordem': number };
  };
  pendentesResolvidos: {
    key: string;
    value: { id: string; expirarEm: number };
    indexes: { 'por-expiracao': number };
  };
}

export const NOME_DO_BANCO = 'capi';
export const VERSAO_DO_BANCO = 7;

let bancoAberto: Promise<IDBPDatabase<EsquemaCapi>> | null = null;

export function abrirBanco(): Promise<IDBPDatabase<EsquemaCapi>> {
  bancoAberto ??= openDB<EsquemaCapi>(NOME_DO_BANCO, VERSAO_DO_BANCO, {
    upgrade(db, versaoAntiga, _versaoNova, tx) {
      // Cada versão nova acrescenta seus stores aqui, sem apagar os antigos.
      if (versaoAntiga < 1) {
        db.createObjectStore('ajustes');
      }
      if (versaoAntiga < 2) {
        const lancamentos = db.createObjectStore('lancamentos', { keyPath: 'id' });
        lancamentos.createIndex('por-data', 'data');
        db.createObjectStore('regras');
      }
      if (versaoAntiga < 3) {
        tx.objectStore('lancamentos').createIndex('por-categoria', 'categoriaId');
        db.createObjectStore('categorias', { keyPath: 'id' });
      }
      if (versaoAntiga < 4) {
        db.createObjectStore('fixos', { keyPath: 'id' });
      }
      if (versaoAntiga < 5) {
        db.createObjectStore('metas', { keyPath: 'id' });
      }
      if (versaoAntiga < 6) {
        db.createObjectStore('faturas', { keyPath: 'id' });
      }
      if (versaoAntiga < 7) {
        const pendentes = db.createObjectStore('pendentes', { keyPath: 'id' });
        pendentes.createIndex('por-ordem', 'ordem');
        const resolvidos = db.createObjectStore('pendentesResolvidos', { keyPath: 'id' });
        resolvidos.createIndex('por-expiracao', 'expirarEm');
      }
    },
  }).catch((erro: unknown) => {
    bancoAberto = null;
    throw erro;
  });
  return bancoAberto;
}

/** Só para testes: esquece a conexão aberta. */
export async function fecharBanco(): Promise<void> {
  if (bancoAberto) (await bancoAberto).close();
  bancoAberto = null;
}
