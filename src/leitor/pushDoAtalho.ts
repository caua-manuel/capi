import { valorEmCentavos } from './url';
import type { PendenteDoAtalho } from '../dominio/pendente';
import { gravarPendentesDoAtalho } from '../repositorio/pendentes';

const CHAVE_DO_CODIGO = 'capi:codigo-do-aparelho';
const CHAVE_EM_INSCRICAO = 'capi:codigo-em-inscricao';
const MUDOU_O_CODIGO = 'capi:mudou-o-codigo-do-aparelho';
const enderecoDaPonte = (import.meta.env.VITE_PONTE_APPLE_PAY_URL ?? '').trim();
const chavePublica = (import.meta.env.VITE_VAPID_CHAVE_PUBLICA ?? '').trim();

export function enderecoDoPagamento(): string | null {
  try {
    const url = new URL('/pagamento', enderecoDaPonte);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function chavePublicaDoAtalho(): Uint8Array<ArrayBuffer> | null {
  try {
    const endereco = new URL(enderecoDaPonte);
    if (endereco.protocol !== 'https:' || !/^B[\w-]{86}$/.test(chavePublica)) return null;
    return Uint8Array.from(atob(chavePublica.replace(/-/g, '+').replace(/_/g, '/')), (byte) => byte.charCodeAt(0));
  } catch {
    return null;
  }
}

export function lerCodigoDoAparelho(): string | null {
  try {
    return localStorage.getItem(CHAVE_DO_CODIGO);
  } catch {
    return null;
  }
}

export function obterCodigoDoAparelho(): string {
  const salvo = lerCodigoDoAparelho() ?? localStorage.getItem(CHAVE_EM_INSCRICAO);
  if (salvo) return salvo;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const codigo = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  localStorage.setItem(CHAVE_EM_INSCRICAO, codigo);
  return codigo;
}

export function confirmarCodigoDoAparelho(codigo: string): void {
  localStorage.setItem(CHAVE_DO_CODIGO, codigo);
  localStorage.removeItem(CHAVE_EM_INSCRICAO);
  window.dispatchEvent(new Event(MUDOU_O_CODIGO));
}

export function apagarCodigoDoAparelho(): void {
  localStorage.removeItem(CHAVE_DO_CODIGO);
  localStorage.removeItem(CHAVE_EM_INSCRICAO);
  window.dispatchEvent(new Event(MUDOU_O_CODIGO));
}

export function ouvirMudancasDoCodigo(ouvinte: () => void): () => void {
  const deOutraJanela = (evento: StorageEvent) => {
    if (evento.key === CHAVE_DO_CODIGO || evento.key === null) ouvinte();
  };
  window.addEventListener(MUDOU_O_CODIGO, ouvinte);
  window.addEventListener('storage', deOutraJanela);
  return () => {
    window.removeEventListener(MUDOU_O_CODIGO, ouvinte);
    window.removeEventListener('storage', deOutraJanela);
  };
}

async function pedir(rota: string, opcoes: RequestInit): Promise<Response> {
  const abortar = new AbortController();
  const prazo = setTimeout(() => abortar.abort(), 15_000);
  try {
    return await fetch(new URL(`/${rota}`, enderecoDaPonte), {
      ...opcoes,
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal: abortar.signal,
    });
  } finally {
    clearTimeout(prazo);
  }
}

export async function enviarParaPonte(rota: 'inscrever' | 'teste', codigo: string, subscription?: PushSubscription): Promise<number> {
  const resposta = await pedir(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, subscription }),
  });
  return resposta.status;
}

export async function desligarAtalho(codigo: string): Promise<void> {
  const resposta = await pedir('desligar', { method: 'POST', headers: { Authorization: `Bearer ${codigo}` } });
  if (resposta.status !== 204) throw new Error('Falha ao desligar o Atalho');
}

export function interpretarPendentes(dados: unknown): PendenteDoAtalho[] {
  if (!Array.isArray(dados)) return [];
  const fila: PendenteDoAtalho[] = [];
  const ids = new Set<string>();
  for (const dado of dados) {
    if (typeof dado?.id !== 'string' || typeof dado.valor !== 'string' || typeof dado.loja !== 'string') continue;
    const valor = valorEmCentavos(dado.valor);
    const loja = dado.loja.trim();
    if (valor === null || !Number.isSafeInteger(valor) || valor <= 0 || !loja || ids.has(dado.id)) continue;
    ids.add(dado.id);
    fila.push({ id: dado.id, valor, loja });
  }
  return fila;
}

// A inicialização em modo estrito do React e os eventos de foco podem pedir a mesma fila juntos.
const buscasEmCurso = new Map<string, Promise<void>>();
const lotesNaoGravados = new Map<string, PendenteDoAtalho[]>();

export function buscarPendentesDoAtalho(codigo: string): Promise<void> {
  const emCurso = buscasEmCurso.get(codigo);
  if (emCurso) return emCurso;

  const busca = (async () => {
    const headers = { Authorization: `Bearer ${codigo}` };
    let recebidos = lotesNaoGravados.get(codigo);
    if (!recebidos) {
      const resposta = await pedir('pendentes/entrega', { method: 'GET', headers });
      if (!resposta.ok) throw new Error('Falha ao buscar Pendentes');
      recebidos = interpretarPendentes(await resposta.json());
      if (recebidos.length === 0) return;
      lotesNaoGravados.set(codigo, recebidos);
    }
    await gravarPendentesDoAtalho(recebidos);
    lotesNaoGravados.delete(codigo);

    // Se a confirmação falhar, a ponte pode reenviar os mesmos ids na próxima busca.
    void pedir('pendentes/confirmar', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(recebidos.map(({ id }) => id)),
    }).catch(() => {});
  })().finally(() => buscasEmCurso.delete(codigo));
  buscasEmCurso.set(codigo, busca);
  return busca;
}
