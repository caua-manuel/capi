import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/worker';

const ORIGEM = 'https://caua-manuel.github.io';
const CODIGO = 'A'.repeat(43);
const OUTRO_CODIGO = `${'B'.repeat(42)}E`;
const ENDPOINT = 'https://web.push.apple.com/teste';

async function ambiente() {
  const vapid = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const navegador = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const base64url = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const inscricao = {
    endpoint: ENDPOINT,
    keys: { p256dh: base64url(await crypto.subtle.exportKey('raw', navegador.publicKey) as ArrayBuffer), auth: 'A'.repeat(22) },
  };
  const kv = new Map<string, string>();
  const env = {
    INSCRICOES: {
      get: vi.fn(async (chave: string) => JSON.parse(kv.get(chave) ?? 'null') as unknown),
      put: vi.fn(async (chave: string, valor: string) => { kv.set(chave, valor); }),
    },
    VAPID: JSON.stringify({
      publicKey: base64url(await crypto.subtle.exportKey('raw', vapid.publicKey) as ArrayBuffer),
      privateKey: (await crypto.subtle.exportKey('jwk', vapid.privateKey) as JsonWebKey).d,
    }),
  };
  return { env, inscricao };
}

function chamada(rota: string, corpo: unknown, origem = ORIGEM) {
  return new Request(`https://capi-ponte.example${rota}`, {
    method: 'POST',
    headers: { Origin: origem, 'Content-Type': 'application/json', 'User-Agent': 'Teste', 'CF-Connecting-IP': '192.0.2.1' },
    body: JSON.stringify(corpo),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Ponte do Atalho', () => {
  it('guarda só o endereço e as chaves da inscrição sob o hash do Código do aparelho', async () => {
    const { env, inscricao } = await ambiente();
    const resposta = await worker.fetch(chamada('/inscrever', {
      codigo: CODIGO,
      subscription: { ...inscricao, expirationTime: 600, keys: { ...inscricao.keys, extra: 'teste' } },
      ip: '192.0.2.2', userAgent: 'Outro', dataDeAcesso: '2026-11-25',
    }), env);

    expect(resposta.status).toBe(204);
    expect(resposta.headers.get('Cache-Control')).toBe('no-store');
    expect(env.INSCRICOES.put).toHaveBeenCalledExactlyOnceWith(
      '0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a',
      JSON.stringify(inscricao),
    );
  });

  it('recusa outra origem, código inválido, corpo grande e endereço fora do serviço da Apple', async () => {
    const { env, inscricao } = await ambiente();
    const corpo = { codigo: CODIGO, subscription: inscricao };
    const externo = await worker.fetch(chamada('/inscrever', corpo, 'https://example.org'), env);

    expect(externo.status).toBe(403);
    expect(externo.headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect((await worker.fetch(chamada('/inscrever', { ...corpo, codigo: 'inválido' }), env)).status).toBe(400);
    expect((await worker.fetch(chamada('/inscrever', { ...corpo, excesso: 'A'.repeat(4096) }), env)).status).toBe(400);
    expect((await worker.fetch(chamada('/inscrever', {
      ...corpo, subscription: { ...inscricao, endpoint: 'https://web.push.apple.com.example.org/' },
    }), env)).status).toBe(400);
    expect(env.INSCRICOES.put).not.toHaveBeenCalled();
  });

  it('envia Web Push criptografado só para quem apresenta o Código do aparelho inscrito', async () => {
    const { env, inscricao } = await ambiente();
    const enviarPush = vi.fn(async (_url: string, _opcoes: RequestInit) => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', enviarPush);
    await worker.fetch(chamada('/inscrever', { codigo: CODIGO, subscription: inscricao }), env);

    expect((await worker.fetch(chamada('/teste', { codigo: OUTRO_CODIGO }), env)).status).toBe(404);
    expect(enviarPush).not.toHaveBeenCalled();
    expect((await worker.fetch(chamada('/teste', { codigo: CODIGO }), env)).status).toBe(204);
    expect(enviarPush).toHaveBeenCalledExactlyOnceWith(ENDPOINT, expect.objectContaining({
      redirect: 'error',
      headers: expect.objectContaining({ 'content-encoding': 'aes128gcm', authorization: expect.stringMatching(/^vapid t=/) }),
    }));
    expect(env.INSCRICOES.put).toHaveBeenCalledTimes(1);
  });

  it('sinaliza inscrição expirada sem expor a resposta interna do provedor', async () => {
    const { env, inscricao } = await ambiente();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Detalhes do provedor', { status: 410 })));
    await worker.fetch(chamada('/inscrever', { codigo: CODIGO, subscription: inscricao }), env);

    const resposta = await worker.fetch(chamada('/teste', { codigo: CODIGO }), env);
    expect(resposta.status).toBe(410);
    expect(await resposta.text()).toBe('');
  });
});
