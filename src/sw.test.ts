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

beforeAll(async () => {
  vi.stubGlobal('self', {
    __WB_MANIFEST: [], skipWaiting: vi.fn(),
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

it('mostra a notificação de teste com o ícone dentro do escopo do Capi', async () => {
  const texto = 'Funcionou! Toque para abrir o Capi';
  await disparar('push', { data: { text: () => texto } });
  expect(showNotification).toHaveBeenCalledWith('Capi', { body: texto, icon: `${escopo}icone-192.png` });
});

it('mostra um texto padrão quando o push chega sem dados', async () => {
  await disparar('push', {});
  expect(showNotification).toHaveBeenCalledWith('Capi', expect.objectContaining({ body: 'Toque para abrir o Capi' }));
});

it('fecha a notificação e foca uma janela do Capi que já está aberta', async () => {
  const close = vi.fn();
  const focus = vi.fn();
  const outraJanela = vi.fn();
  matchAll.mockResolvedValue([{ url: `${escopo}fora`, focus } , { url: escopo.replace('/capi/', '/outro/'), focus: outraJanela }]);
  await disparar('notificationclick', { notification: { close } });
  expect(close).toHaveBeenCalledOnce();
  expect(matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true });
  expect(focus).toHaveBeenCalledOnce();
  expect(outraJanela).not.toHaveBeenCalled();
  expect(openWindow).not.toHaveBeenCalled();
});

it('abre o escopo do Capi se a janela existente for de outro app', async () => {
  matchAll.mockResolvedValue([{ url: escopo.replace('/capi/', '/capi-outro/'), focus: vi.fn() }]);
  await disparar('notificationclick', { notification: { close: vi.fn() } });
  expect(openWindow).toHaveBeenCalledExactlyOnceWith(escopo);
});
