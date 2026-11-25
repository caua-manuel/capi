import { buildPushPayload, type VapidKeys } from '@block65/webcrypto-web-push';

interface Ambiente {
  INSCRICOES: Pick<KVNamespace, 'put'> & { get(chave: string, formato: 'json'): Promise<unknown> };
  VAPID: string;
}

interface Inscricao {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const ORIGEM_DO_APP = 'https://caua-manuel.github.io';
const TAMANHO_MAXIMO_DO_CORPO = 4096;
const CODIGO_DO_APARELHO = /^[\w-]{42}[AEIMQUYcgkosw048]$/;

function objeto(dado: unknown): dado is Record<string, unknown> {
  return typeof dado === 'object' && dado !== null && !Array.isArray(dado);
}

async function lerCorpo(request: Request): Promise<unknown> {
  const leitor = request.body?.getReader();
  if (!leitor || request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return null;

  const bytes = new Uint8Array(TAMANHO_MAXIMO_DO_CORPO);
  let tamanho = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    if (tamanho + value.length > bytes.length) {
      await leitor.cancel();
      return null;
    }
    bytes.set(value, tamanho);
    tamanho += value.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes.subarray(0, tamanho)));
  } catch {
    return null;
  }
}

function lerInscricao(dado: unknown): Inscricao | null {
  if (!objeto(dado) || typeof dado.endpoint !== 'string' || !objeto(dado.keys)) return null;
  const { p256dh, auth } = dado.keys;
  if (typeof p256dh !== 'string' || !/^B[\w-]{85}[AEIMQUYcgkosw048]$/.test(p256dh)) return null;
  if (typeof auth !== 'string' || !/^[\w-]{21}[AQgw]$/.test(auth)) return null;

  const url = URL.parse(dado.endpoint);
  if (url?.protocol !== 'https:' || !url.hostname.endsWith('.push.apple.com')) return null;
  if (url.username || url.password || url.port || url.hash) return null;
  return { endpoint: url.href, keys: { p256dh, auth } };
}

async function hashDoCodigo(codigo: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codigo));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request: Request, env: Ambiente): Promise<Response> {
    const origemPermitida = request.headers.get('Origin') === ORIGEM_DO_APP;
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (origemPermitida) headers.set('Access-Control-Allow-Origin', ORIGEM_DO_APP);
    const responder = (status: number) => new Response(null, { status, headers });

    if (!origemPermitida) return responder(403);
    const { pathname } = new URL(request.url);
    if (pathname !== '/inscrever' && pathname !== '/teste') return responder(404);

    if (request.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Methods', 'POST');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return responder(204);
    }
    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS');
      return responder(405);
    }

    try {
      const corpo = await lerCorpo(request);
      if (!objeto(corpo) || typeof corpo.codigo !== 'string' || !CODIGO_DO_APARELHO.test(corpo.codigo)) return responder(400);
      const hash = await hashDoCodigo(corpo.codigo);

      if (pathname === '/inscrever') {
        const inscricao = lerInscricao(corpo.subscription);
        if (!inscricao) return responder(400);
        await env.INSCRICOES.put(hash, JSON.stringify(inscricao));
        return responder(204);
      }

      const inscricao = lerInscricao(await env.INSCRICOES.get(hash, 'json'));
      if (!inscricao) return responder(404);

      const { publicKey, privateKey } = JSON.parse(env.VAPID) as VapidKeys;
      const envio = await buildPushPayload(
        { data: 'Funcionou! Toque para abrir o Capi', options: { ttl: 300 } },
        { ...inscricao, expirationTime: null },
        { subject: ORIGEM_DO_APP, publicKey, privateKey },
      );
      const resposta = await fetch(inscricao.endpoint, { ...envio, redirect: 'error' });
      await resposta.body?.cancel();
      if (resposta.status === 404 || resposta.status === 410) return responder(410);
      return responder(resposta.ok ? 204 : 502);
    } catch {
      return responder(503);
    }
  },
};
