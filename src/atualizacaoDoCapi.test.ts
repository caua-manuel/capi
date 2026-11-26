import { afterEach, expect, it, vi } from 'vitest';
import { acompanharAtualizacao, type AtualizacaoDoCapi } from './atualizacaoDoCapi';

afterEach(() => vi.unstubAllGlobals());

it('preserva o rascunho aberto durante a ativação e oferece atualizar de novo ao fechar o Novo gasto', async () => {
  const anterior = {};
  const proxima = { postMessage: vi.fn() };
  const registro = Object.assign(new EventTarget(), {
    active: anterior,
    waiting: proxima as typeof proxima | null,
    update: vi.fn(async () => {}),
  });
  const serviceWorker = Object.assign(new EventTarget(), { controller: anterior, ready: Promise.resolve(registro) });
  const reload = vi.fn();
  vi.stubGlobal('navigator', { serviceWorker, onLine: true });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { reload }, setTimeout, clearTimeout, setInterval, clearInterval }));
  vi.stubGlobal('document', new EventTarget());
  const estados: (AtualizacaoDoCapi | null)[] = [];
  let temRascunho = true;
  const parar = acompanharAtualizacao((atualizacao) => estados.push(atualizacao), () => !temRascunho);
  try {
    await serviceWorker.ready;
    const pronta = estados.at(-1);
    expect(pronta).toMatchObject({ aplicando: false });
    pronta?.aplicar();
    expect(proxima.postMessage).not.toHaveBeenCalled();

    temRascunho = false;
    pronta?.aplicar();
    expect(proxima.postMessage).toHaveBeenCalledOnce();
    temRascunho = true;
    registro.waiting = null;
    serviceWorker.controller = proxima;
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();

    temRascunho = false;
    expect(estados.at(-1)).toMatchObject({ aplicando: false });
    estados.at(-1)?.aplicar();
    expect(reload).toHaveBeenCalledOnce();
  } finally {
    parar();
  }
});
