import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import { build } from 'esbuild';
import { convertV4MiniflareOptions, Miniflare, Response as RespostaDoSimulador } from 'miniflare';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { CHAVES_DE_TESTE, decifrarPeloNavegadorDeTeste, INSCRICAO_DE_TESTE, ORIGEM } from './rfc8291';

const URL_DA_PONTE = 'https://capi-ponte.example';
const novoCodigo = () => randomBytes(32).toString('base64url');
const enviarPush = vi.fn<(request: Request) => Promise<RespostaDoSimulador>>();
let simulador: Miniflare;

beforeAll(async () => {
  const { outputFiles } = await build({
    entryPoints: ['src/worker.ts'], bundle: true, write: false, format: 'esm', external: ['cloudflare:workers'],
  });
  simulador = new Miniflare(convertV4MiniflareOptions({
    name: 'ponte', modules: true, script: outputFiles[0].text, compatibilityDate: '2026-11-25',
    unsafeInspectDurableObjects: true,
    kvNamespaces: ['INSCRICOES', 'PENDENTES'], bindings: { VAPID: JSON.stringify(CHAVES_DE_TESTE) },
    durableObjects: { COORDENACAO: { className: 'CoordenacaoDoAtalho', useSQLite: true } },
    ratelimits: { LIMITE_POR_ROTA: { namespace_id: '682025', simple: { limit: 120, period: 60 } } },
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

const hashDoTeste = (codigo: string) => createHash('sha256').update(codigo).digest('hex');

function pagar(codigo: string, corpo: unknown, origin?: string) {
  return simulador.dispatchFetch(`${URL_DA_PONTE}/pagamento`, {
    method: 'POST', headers: {
      Authorization: `Bearer ${codigo}`, 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}),
    }, body: JSON.stringify(corpo),
  });
}

function pendentes(codigo: string, origin = ORIGEM) {
  return simulador.dispatchFetch(`${URL_DA_PONTE}/pendentes`, { headers: { Origin: origin, Authorization: `Bearer ${codigo}` } });
}

function desligar(codigo: string) {
  return simulador.dispatchFetch(`${URL_DA_PONTE}/desligar`, { method: 'POST', headers: { Origin: ORIGEM, Authorization: `Bearer ${codigo}` } });
}

async function inscrever(): Promise<string> {
  const codigo = novoCodigo();
  expect((await postar('/inscrever', { codigo, subscription: INSCRICAO_DE_TESTE })).status).toBe(204);
  return codigo;
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
  expect((await postar('/inscrever', {
    ...corpo, subscription: { ...INSCRICAO_DE_TESTE, keys: { ...INSCRICAO_DE_TESTE.keys, p256dh: `B${'A'.repeat(86)}` } },
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

it('rejeita origens externas e exige Bearer válido na automação nativa', async () => {
  const codigo = await inscrever();
  const pagamento = { valor: 42.5, loja: 'Mercado' };
  const outraOrigem = await pagar(codigo, pagamento, 'https://example.org');
  expect(outraOrigem.status).toBe(403);
  expect(outraOrigem.headers.has('Access-Control-Allow-Origin')).toBe(false);
  expect((await pagar(codigo, pagamento, 'null')).status).toBe(403);
  expect((await pagar('', pagamento)).status).toBe(401);
  expect((await pagar(novoCodigo(), pagamento)).status).toBe(401);
  expect((await pendentes(novoCodigo())).status).toBe(401);
  expect((await pendentes(codigo, 'https://example.org')).status).toBe(403);
  const preflight = await simulador.dispatchFetch(`${URL_DA_PONTE}/pendentes`, {
    method: 'OPTIONS', headers: { Origin: ORIGEM, 'Access-Control-Request-Method': 'GET' },
  });
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ORIGEM);
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
});

it('valida os limites de Quantia e Loja e recusa valor negativo ou impreciso', async () => {
  const codigo = await inscrever();
  for (const valor of ['-1,00', 2.005, '9'.repeat(31), 'nove 7', 0]) {
    expect((await pagar(codigo, { valor, loja: 'Mercado' })).status).toBe(400);
  }
  expect((await pagar(codigo, { valor: '1,00', loja: 'a'.repeat(61) })).status).toBe(400);
  expect((await pagar(codigo, { valor: '1,00', loja: '  ' })).status).toBe(400);
  expect(await (await pendentes(codigo)).json()).toEqual([]);
});

it('expira em 48 horas, guarda só o valor e a Loja e entrega a fila a uma única leitura', async () => {
  const enviados: string[] = [];
  enviarPush.mockClear().mockImplementation(async (pedido) => {
    enviados.push(decifrarPeloNavegadorDeTeste(Buffer.from(await pedido.arrayBuffer())));
    return new RespostaDoSimulador(null, { status: 201 });
  });
  const codigo = await inscrever();
  const antes = Math.floor(Date.now() / 1000);
  expect((await pagar(codigo, {
    valor: 'R$ 1.234,50', loja: ' Mercado 3x ', dataDeAcesso: '2026-11-25', ip: '192.0.2.1', userAgent: 'Teste',
  })).status).toBe(202);
  expect((await pagar(codigo, { valor: 9.07, loja: '99 Food' })).status).toBe(202);
  const kv = await simulador.getKVNamespace('PENDENTES');
  const prefix = `${hashDoTeste(codigo)}:`;
  const { keys } = await kv.list({ prefix });
  expect(keys).toHaveLength(2);
  for (const chave of keys) {
    expect(chave.expiration).toBeGreaterThanOrEqual(antes + 172800);
    expect(chave.expiration).toBeLessThanOrEqual(Math.ceil(Date.now() / 1000) + 172800);
    expect(chave.metadata).toBeUndefined();
    expect(Object.keys(await kv.get(chave.name, 'json') ?? {}).sort()).toEqual(['loja', 'valor']);
  }

  const leituras = await Promise.all([pendentes(codigo), pendentes(codigo)]);
  expect(leituras.map(({ status }) => status)).toEqual([200, 200]);
  const fila = (await Promise.all(leituras.map((resposta) => resposta.json() as Promise<unknown[]>))).flat();
  expect(fila).toEqual([
    { id: expect.any(String), valor: '1234,50', loja: 'Mercado 3x' },
    { id: expect.any(String), valor: '9,07', loja: '99 Food' },
  ]);
  expect((await kv.list({ prefix })).keys).toEqual([]);
  await expect.poll(() => enviados.length).toBe(2);
  expect(enviados.map((texto) => JSON.parse(texto))).toEqual(expect.arrayContaining([
    { id: (fila[0] as { id: string }).id, texto: 'R$ 1.234,50 · Mercado 3x — toque para categorizar' },
    { id: (fila[1] as { id: string }).id, texto: 'R$ 9,07 · 99 Food — toque para categorizar' },
  ]));
});

it('aceita o pagamento e preserva o Pendente quando o push falha', async () => {
  const codigo = await inscrever();
  enviarPush.mockClear().mockImplementation(async () => new RespostaDoSimulador(null, { status: 500 }));
  expect((await pagar(codigo, { valor: '42,50', loja: 'Padaria' })).status).toBe(202);
  await expect.poll(() => enviarPush.mock.calls.length).toBe(1);
  expect(await (await pendentes(codigo)).json()).toEqual([{ id: expect.any(String), valor: '42,50', loja: 'Padaria' }]);
});

it('revoga o Código do aparelho e apaga inscrição e Pendentes sem afetar outro código', async () => {
  const codigo = await inscrever();
  const outro = await inscrever();
  expect((await pagar(codigo, { valor: '5,00', loja: 'Padaria' })).status).toBe(202);
  expect((await desligar(codigo)).status).toBe(204);
  await simulador.unsafeEvictDurableObject('ponte', 'CoordenacaoDoAtalho', { name: hashDoTeste(codigo) });
  expect((await desligar(codigo)).status).toBe(204);
  expect((await pagar(codigo, { valor: '5,00', loja: 'Padaria' })).status).toBe(401);
  expect((await pendentes(codigo)).status).toBe(401);
  expect((await postar('/inscrever', { codigo, subscription: INSCRICAO_DE_TESTE })).status).toBe(409);
  expect(await (await simulador.getKVNamespace('INSCRICOES')).get(hashDoTeste(codigo))).toBeNull();
  expect((await (await simulador.getKVNamespace('PENDENTES')).list({ prefix: `${hashDoTeste(codigo)}:` })).keys).toEqual([]);
  expect((await pendentes(outro)).status).toBe(200);
});

it('limita a 60 chamadas por Código do aparelho por hora e ainda permite apagar os dados', async () => {
  const codigo = await inscrever();
  const outro = await inscrever();
  const respostas = await Promise.all(Array.from({ length: 60 }, () => pendentes(codigo)));
  expect(respostas.filter((resposta) => resposta.status === 200)).toHaveLength(59);
  const limitada = respostas.filter((resposta) => resposta.status === 429);
  expect(limitada).toHaveLength(1);
  expect(Number(limitada[0].headers.get('Retry-After'))).toBeGreaterThan(0);
  expect((await pendentes(outro)).status).toBe(200);
  expect((await desligar(codigo)).status).toBe(204);
}, 15_000);

it('limita inscrições na borda mesmo com Códigos do aparelho diferentes', async () => {
  const respostas = await Promise.all(Array.from({ length: 121 }, () => postar('/inscrever', { codigo: novoCodigo() })));
  expect(respostas.some((resposta) => resposta.status === 400)).toBe(true);
  expect(respostas.some((resposta) => resposta.status === 429 && resposta.headers.get('Retry-After') === '60')).toBe(true);
}, 15_000);
