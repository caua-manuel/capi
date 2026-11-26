import { buildPushPayload, type VapidKeys } from '@block65/webcrypto-web-push';
import type { Acao, Ambiente } from './coordenacao';
import { centavosParaTexto, codigoValido, hashDoCodigo, lerCorpo, lerInscricao, lerPagamento, objeto, ORIGEM_DO_APP, type Inscricao } from './entrada';

export { CoordenacaoDoAtalho } from './coordenacao';

const ROTAS = new Map([
  ['/inscrever', 'POST'], ['/teste', 'POST'], ['/pagamento', 'POST'], ['/pendentes', 'GET'], ['/desligar', 'POST'],
  ['/pendentes/entrega', 'GET'], ['/pendentes/confirmar', 'POST'],
]);

async function enviarPush(env: Ambiente, inscricao: Inscricao, data: string | { id: string; texto: string }): Promise<number> {
  const { publicKey, privateKey } = JSON.parse(env.VAPID) as VapidKeys;
  const envio = await buildPushPayload(
    { data, options: { ttl: 300 } }, { ...inscricao, expirationTime: null },
    { subject: ORIGEM_DO_APP, publicKey, privateKey },
  );
  const resposta = await fetch(inscricao.endpoint, { ...envio, redirect: 'manual', signal: AbortSignal.timeout(8_000) });
  await resposta.body?.cancel();
  if (resposta.status === 404 || resposta.status === 410) return 410;
  return resposta.ok ? 204 : 502;
}

export default {
  async fetch(request: Request, env: Ambiente, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    const origem = request.headers.get('Origin');
    const origemDoApp = origem === ORIGEM_DO_APP;
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (origemDoApp) headers.set('Access-Control-Allow-Origin', ORIGEM_DO_APP);
    const responder = (status: number) => new Response(null, { status, headers });

    // A automação nativa do Atalhos usa Bearer e envia a requisição sem Origin.
    if (!origemDoApp && !(pathname === '/pagamento' && origem === null && request.method === 'POST')) return responder(403);
    const metodo = ROTAS.get(pathname);
    if (!metodo) return responder(404);
    if (request.method === 'OPTIONS') {
      const solicitado = request.headers.get('Access-Control-Request-Method');
      if (solicitado && solicitado !== metodo) return responder(405);
      headers.set('Access-Control-Allow-Methods', metodo);
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return responder(204);
    }
    if (request.method !== metodo) {
      headers.set('Allow', `${metodo}, OPTIONS`);
      return responder(405);
    }

    try {
      // O limite regional por rota protege a cota grátis mesmo se cada chamada usar um código diferente.
      if (!(await env.LIMITE_POR_ROTA.limit({ key: pathname })).success) {
        headers.set('Retry-After', '60');
        return responder(429);
      }
      let codigo: string;
      let acao: Acao;
      if (pathname === '/inscrever' || pathname === '/teste') {
        const corpo = await lerCorpo(request);
        if (!objeto(corpo) || !codigoValido(corpo.codigo)) return responder(400);
        codigo = corpo.codigo;
        if (pathname === '/inscrever') {
          const inscricao = lerInscricao(corpo.subscription);
          if (!inscricao) return responder(400);
          try {
            const base64 = inscricao.keys.p256dh.replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(base64), (byte) => byte.charCodeAt(0));
            await crypto.subtle.importKey('raw', bytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
          } catch {
            return responder(400);
          }
          acao = { tipo: 'inscrever', inscricao };
        } else {
          acao = { tipo: 'teste' };
        }
      } else {
        const bearer = /^Bearer (\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1];
        if (!codigoValido(bearer)) return responder(401);
        codigo = bearer;
        if (pathname === '/pagamento') {
          const pagamento = lerPagamento(await lerCorpo(request));
          if (!pagamento) return responder(400);
          acao = { tipo: 'pagamento', pagamento };
        } else if (pathname === '/pendentes/confirmar') {
          const ids = await lerCorpo(request, 8192);
          if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((id) =>
            typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id))) return responder(400);
          acao = { tipo: 'confirmar', ids };
        } else if (pathname === '/desligar') {
          acao = { tipo: 'desligar' };
        } else {
          acao = { tipo: 'pendentes', apagarNaLeitura: pathname === '/pendentes' };
        }
      }

      const hash = await hashDoCodigo(codigo);
      const coordenacao = env.COORDENACAO.getByName(hash);
      const resultado = await coordenacao.operar(hash, acao);
      if (resultado.status === 200) return Response.json(resultado.pendentes, { headers });
      if (resultado.status === 202 && acao.tipo === 'pagamento') {
        const { valor, loja } = acao.pagamento;
        const texto = `R$ ${centavosParaTexto(valor, true)} · ${loja} — toque para categorizar`;
        ctx.waitUntil(enviarPush(env, resultado.inscricao, { id: resultado.id, texto }).catch(() => {}));
      }
      if (resultado.status === 204 && resultado.inscricao) {
        return responder(await enviarPush(env, resultado.inscricao, 'Funcionou! Toque para abrir o Capi'));
      }
      if (resultado.status === 429 && resultado.tentarEm !== undefined) headers.set('Retry-After', String(resultado.tentarEm));
      return responder(resultado.status);
    } catch {
      return responder(503);
    }
  },
};
