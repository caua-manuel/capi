import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';

vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() }));
vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(), cleanupOutdatedCaches: vi.fn(), createHandlerBoundToURL: vi.fn(),
}));
vi.mock('workbox-routing', () => ({ NavigationRoute: class {}, registerRoute: vi.fn() }));

const escopo = 'https://caua-manuel.github.io/capi/';
const ouvintes = new Map<string, (evento: object) => void>();
const showNotification = vi.fn();
const matchAll = vi.fn();
const openWindow = vi.fn();
const skipWaiting = vi.fn(async () => {});

beforeAll(async () => {
  vi.stubGlobal('self', {
    __WB_MANIFEST: [], skipWaiting,
    registration: { scope: escopo, showNotification }, clients: { matchAll, openWindow },
    addEventListener: (tipo: string, ouvinte: (evento: object) => void) => ouvintes.set(tipo, ouvinte),
  });
  await import('./sw');
});
beforeEach(() => vi.clearAllMocks());
afterAll(() => vi.unstubAllGlobals());

async function disparar(tipo: string, evento: object) {
  const waitUntil = vi.fn();
  ouvintes.get(tipo)?.({ ...evento, waitUntil });
  expect(waitUntil).toHaveBeenCalledOnce();
  await waitUntil.mock.calls[0]?.[0];
}

it('ativa a atualização quando o app pede e ignora outras mensagens', async () => {
  ouvintes.get('message')?.({ data: { type: 'outra-mensagem' } });
  expect(skipWaiting).not.toHaveBeenCalled();
  await disparar('message', { data: { type: 'SKIP_WAITING' } });
  expect(skipWaiting).toHaveBeenCalledOnce();
});

it('mostra a notificação de teste com o ícone dentro do escopo do Capi', async () => {
  const texto = 'Funcionou! Toque para abrir o Capi';
  await disparar('push', { data: { text: () => texto } });
  expect(showNotification).toHaveBeenCalledWith('Capi', { body: texto, icon: `${escopo}icone-192.png` });
});

it('mostra um texto padrão quando o push chega sem dados', async () => {
  await disparar('push', {});
  expect(showNotification).toHaveBeenCalledWith('Capi', expect.objectContaining({ body: 'Toque para abrir o Capi' }));
});

it('mostra o pagamento com seu identificador para manter as notificações distintas', async () => {
  const texto = 'R$ 42,50 · Mercadinho — toque para categorizar';
  const data = { text: () => JSON.stringify({ id: 'pendente-1', texto }) };
  await disparar('push', { data });
  expect(showNotification).toHaveBeenCalledWith('Capi', { body: texto, icon: `${escopo}icone-192.png`, tag: 'pendente-1' });
});

it('omite dados inválidos da notificação', async () => {
  await disparar('push', { data: { text: () => '{"id":"pendente-1"}' } });
  expect(showNotification).toHaveBeenCalledWith('Capi', { body: 'Toque para abrir o Capi', icon: `${escopo}icone-192.png` });
});

it('fecha a notificação e foca uma janela do Capi que já está aberta', async () => {
  const close = vi.fn();
  const focus = vi.fn();
  const outraJanela = vi.fn();
  const postMessage = vi.fn();
  matchAll.mockResolvedValue([{ url: `${escopo}atalho`, focus, postMessage }, { url: escopo.replace('/capi/', '/outro/'), focus: outraJanela }]);
  await disparar('notificationclick', { notification: { close } });
  expect(close).toHaveBeenCalledOnce();
  expect(matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true });
  expect(focus).toHaveBeenCalledOnce();
  expect(postMessage).toHaveBeenCalledExactlyOnceWith({ tipo: 'buscar-pendentes-do-atalho' });
  expect(outraJanela).not.toHaveBeenCalled();
  expect(openWindow).not.toHaveBeenCalled();
});

it('abre o escopo do Capi se a janela existente for de outro app', async () => {
  matchAll.mockResolvedValue([{ url: escopo.replace('/capi/', '/capi-outro/'), focus: vi.fn() }]);
  await disparar('notificationclick', { notification: { close: vi.fn() } });
  expect(openWindow).toHaveBeenCalledExactlyOnceWith(escopo);
});
