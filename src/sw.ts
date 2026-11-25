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
  evento.waitUntil(self.registration.showNotification('Capi', {
    body: evento.data?.text() || 'Toque para abrir o Capi',
    icon: new URL('icone-192.png', self.registration.scope).href,
  }));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil((async () => {
    const escopo = self.registration.scope;
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const janela = janelas.find(({ url }) => url.startsWith(escopo));
    if (janela) return janela.focus();
    return self.clients.openWindow(escopo);
  })());
});
