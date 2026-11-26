export type AtualizacaoDoCapi = { aplicar: () => void; aplicando: boolean };

export function acompanharAtualizacao(
  aoMudar: (atualizacao: AtualizacaoDoCapi | null) => void,
  podeRecarregar: () => boolean,
): () => void {
  const worker = navigator.serviceWorker;
  if (!worker) return () => {};

  let registro: ServiceWorkerRegistration | undefined;
  let instalando: ServiceWorker | null = null;
  let versaoDaPagina = worker.controller;
  let verificando = false;
  let encerrar = false;
  let prazo: number | undefined;
  let emAtivacao: ServiceWorker | null = null;

  const versaoMudou = () => Boolean(versaoDaPagina && worker.controller && worker.controller !== versaoDaPagina);
  const atualizarBotao = () => {
    const pronta = versaoMudou() || Boolean(registro?.waiting);
    aoMudar(pronta ? { aplicar, aplicando: prazo !== undefined } : null);
  };

  function aplicar() {
    if (prazo !== undefined || !podeRecarregar()) return;
    if (versaoMudou()) {
      window.location.reload();
      return;
    }
    const proxima = registro?.waiting;
    if (!proxima) return;
    emAtivacao = proxima;
    prazo = window.setTimeout(() => {
      prazo = undefined;
      emAtivacao = null;
      atualizarBotao();
    }, 15_000);
    try {
      proxima.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      window.clearTimeout(prazo);
      prazo = undefined;
      emAtivacao = null;
    }
    atualizarBotao();
  }

  const mudouControle = () => {
    if (emAtivacao && (worker.controller === emAtivacao || versaoMudou())) {
      window.clearTimeout(prazo);
      emAtivacao = null;
      prazo = undefined;
      if (podeRecarregar()) {
        window.location.reload();
        return;
      }
    }
    versaoDaPagina ??= worker.controller;
    atualizarBotao();
  };

  const observarInstalacao = () => {
    instalando?.removeEventListener('statechange', atualizarBotao);
    instalando = registro?.installing ?? null;
    instalando?.addEventListener('statechange', atualizarBotao);
    atualizarBotao();
  };
  const verificar = () => {
    if (!registro || verificando || !navigator.onLine || document.visibilityState === 'hidden') return;
    verificando = true;
    void registro.update().catch(() => {}).finally(() => {
      verificando = false;
      if (!encerrar) atualizarBotao();
    });
  };

  worker.addEventListener('controllerchange', mudouControle);
  window.addEventListener('focus', verificar);
  window.addEventListener('online', verificar);
  document.addEventListener('visibilitychange', verificar);
  const intervalo = window.setInterval(verificar, 15 * 60_000);
  void worker.ready.then((pronto) => {
    if (encerrar) return;
    registro = pronto;
    versaoDaPagina ??= pronto.active;
    registro.addEventListener('updatefound', observarInstalacao);
    observarInstalacao();
    verificar();
  });
  return () => {
    encerrar = true;
    worker.removeEventListener('controllerchange', mudouControle);
    window.removeEventListener('focus', verificar);
    window.removeEventListener('online', verificar);
    document.removeEventListener('visibilitychange', verificar);
    registro?.removeEventListener('updatefound', observarInstalacao);
    instalando?.removeEventListener('statechange', atualizarBotao);
    window.clearInterval(intervalo);
    window.clearTimeout(prazo);
  };
}
