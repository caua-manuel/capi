/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

// Mantém o precache, a navegação offline e a atualização automática do Worker anterior.
void self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.addEventListener('push', (evento) => {
  const conteudo = evento.data?.text();
  let body = conteudo || 'Toque para abrir o Capi';
  let tag: string | undefined;
  if (conteudo?.startsWith('{')) {
    try {
      const dados = JSON.parse(conteudo) as { id?: unknown; texto?: unknown } | null;
      if (typeof dados?.id === 'string' && typeof dados.texto === 'string') {
        body = dados.texto;
        tag = dados.id;
      } else {
        body = 'Toque para abrir o Capi';
      }
    } catch {
      body = 'Toque para abrir o Capi';
    }
  }
  evento.waitUntil(self.registration.showNotification('Capi', {
    body,
    ...(tag ? { tag } : {}),
    icon: new URL('icone-192.png', self.registration.scope).href,
  }));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil((async () => {
    const escopo = self.registration.scope;
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const janela = janelas.find(({ url }) => url.startsWith(escopo));
    if (janela) {
      await janela.focus();
      janela.postMessage({ tipo: 'buscar-pendentes-do-atalho' });
    } else {
      await self.clients.openWindow(escopo);
    }
  })());
});
