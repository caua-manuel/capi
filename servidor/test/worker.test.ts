import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { build } from 'esbuild';
import { convertV4MiniflareOptions, Miniflare, Response as RespostaDoSimulador } from 'miniflare';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { CHAVES_DE_TESTE, INSCRICAO_DE_TESTE, ORIGEM } from './rfc8291';

const URL_DA_PONTE = 'https://capi-ponte.example';
const novoCodigo = () => randomBytes(32).toString('base64url');
const enviarPush = vi.fn<(request: Request) => Promise<RespostaDoSimulador>>();
let simulador: Miniflare;

beforeAll(async () => {
  const { outputFiles } = await build({ entryPoints: ['src/worker.ts'], bundle: true, write: false, format: 'esm' });
  simulador = new Miniflare(convertV4MiniflareOptions({
    name: 'ponte', modules: true, script: outputFiles[0].text, compatibilityDate: '2026-11-25',
    kvNamespaces: ['INSCRICOES'], bindings: { VAPID: JSON.stringify(CHAVES_DE_TESTE) },
    outboundService: (request) => enviarPush(request as unknown as Request),
  }));
});

afterAll(async () => { await simulador?.dispose(); });

function postar(rota: string, corpo: unknown, origem = ORIGEM) {
  return simulador.dispatchFetch(`${URL_DA_PONTE}${rota}`, {
    method: 'POST',
    headers: { Origin: origem, 'Content-Type': 'application/json', 'User-Agent': 'Teste', 'CF-Connecting-IP': '192.0.2.1' },
    body: JSON.stringify(corpo),
  });
}

it('guarda só o endereço e as chaves da inscrição sob o hash do Código do aparelho', async () => {
  const resposta = await postar('/inscrever', {
    codigo: 'A'.repeat(43),
    subscription: { ...INSCRICAO_DE_TESTE, expirationTime: 600, keys: { ...INSCRICAO_DE_TESTE.keys, extra: 'teste' } },
    ip: '192.0.2.2', userAgent: 'Outro', dataDeAcesso: '2026-11-25',
  });
  expect(resposta.status).toBe(204);
  expect(resposta.headers.get('Cache-Control')).toBe('no-store');
  const kv = await simulador.getKVNamespace('INSCRICOES');
  const hash = '0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a';
  expect((await kv.list()).keys).toEqual([{ name: hash }]);
  expect(await kv.get(hash, 'json')).toEqual(INSCRICAO_DE_TESTE);
});

it('recusa outra origem, código inválido, corpo grande e endereço fora do serviço da Apple', async () => {
  const corpo = { codigo: novoCodigo(), subscription: INSCRICAO_DE_TESTE };
  const externo = await postar('/inscrever', corpo, 'https://example.org');
  expect(externo.status).toBe(403);
  expect(externo.headers.has('Access-Control-Allow-Origin')).toBe(false);
  expect((await postar('/inscrever', { ...corpo, codigo: 'inválido' })).status).toBe(400);
  expect((await postar('/inscrever', { ...corpo, excesso: 'A'.repeat(4096) })).status).toBe(400);
  expect((await postar('/inscrever', {
    ...corpo, subscription: { ...INSCRICAO_DE_TESTE, endpoint: 'https://web.push.apple.com.example.org/' },
  })).status).toBe(400);
});

it('envia Web Push com VAPID verificável só para o Código do aparelho inscrito', async () => {
  enviarPush.mockClear().mockResolvedValueOnce(new RespostaDoSimulador(null, { status: 201 }));
  const codigo = novoCodigo();
  expect((await postar('/inscrever', { codigo, subscription: INSCRICAO_DE_TESTE })).status).toBe(204);

  expect((await postar('/teste', { codigo: novoCodigo() })).status).toBe(404);
  expect(enviarPush).not.toHaveBeenCalled();
  const resposta = await postar('/teste', { codigo });
  expect(resposta.status, await resposta.text()).toBe(204);
  expect(enviarPush).toHaveBeenCalledTimes(1);
  const [pedido] = enviarPush.mock.calls[0];
  expect(pedido.url).toBe(INSCRICAO_DE_TESTE.endpoint);
  expect(pedido.headers.get('Content-Encoding')).toBe('aes128gcm');

  const autorizacao = pedido.headers.get('Authorization') ?? '';
  const [, cabecalho, corpo, assinatura, publica] = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(autorizacao) ?? [];
  expect(publica).toBe(CHAVES_DE_TESTE.publicKey);
  expect(JSON.parse(Buffer.from(cabecalho, 'base64url').toString())).toMatchObject({ alg: 'ES256' });
  expect(JSON.parse(Buffer.from(corpo, 'base64url').toString())).toMatchObject({ aud: new URL(pedido.url).origin, sub: ORIGEM });
  const chave = await crypto.subtle.importKey('raw', Buffer.from(publica, 'base64url'), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chave,
    Buffer.from(assinatura, 'base64url'), new TextEncoder().encode(`${cabecalho}.${corpo}`))).toBe(true);
});

it('sinaliza inscrição expirada sem expor a resposta interna do provedor', async () => {
  enviarPush.mockResolvedValueOnce(new RespostaDoSimulador('Detalhes do provedor', { status: 410 }));
  const codigo = novoCodigo();
  await postar('/inscrever', { codigo, subscription: INSCRICAO_DE_TESTE });
  const resposta = await postar('/teste', { codigo });
  expect(resposta.status).toBe(410);
  expect(await resposta.text()).toBe('');
});

it('recusa redirecionamento do provedor de push', async () => {
  enviarPush.mockClear().mockResolvedValueOnce(new RespostaDoSimulador(null, {
    status: 307, headers: { Location: 'https://example.org/' },
  }));
  const codigo = novoCodigo();
  await postar('/inscrever', { codigo, subscription: INSCRICAO_DE_TESTE });
  expect((await postar('/teste', { codigo })).status).toBe(502);
  expect(enviarPush).toHaveBeenCalledTimes(1);
});
