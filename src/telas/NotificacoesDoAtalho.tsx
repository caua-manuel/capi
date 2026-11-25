import { useEffect, useState } from 'react';
import { chavePublicaDoAtalho, enviarParaPonte, lerCodigoDoAparelho, obterCodigoDoAparelho } from '../leitor/pushDoAtalho';
import { lerAmbiente } from './instalacao';

export function NotificacoesDoAtalho() {
  const { standaloneDoIOS, modoDeExibicaoStandalone } = lerAmbiente();
  const instalado = standaloneDoIOS || modoDeExibicaoStandalone;
  const suportaPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [chavePublica] = useState(chavePublicaDoAtalho);
  const [registro, setRegistro] = useState<ServiceWorkerRegistration>();
  const [inscricao, setInscricao] = useState<PushSubscription | null>(null);
  const [codigo, setCodigo] = useState(lerCodigoDoAparelho);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!instalado || !suportaPush || !chavePublica) return;
    let visivel = true;
    void navigator.serviceWorker.ready.then(async (pronto) => {
      const atual = await pronto.pushManager.getSubscription();
      if (!visivel) return;
      setInscricao(atual);
      setRegistro(pronto);
    }).catch(() => {
      if (visivel) setMensagem('O Capi não conseguiu preparar as notificações. Feche o app e abra novamente.');
    });
    return () => { visivel = false; };
  }, [instalado, suportaPush, chavePublica]);

  async function ativar() {
    if (!registro || !chavePublica) return;
    setOcupado(true);
    setMensagem('');
    try {
      const chaveAnterior = new Uint8Array(inscricao?.options.applicationServerKey ?? []);
      if (inscricao && (chaveAnterior.length !== chavePublica.length || chaveAnterior.some((byte, i) => byte !== chavePublica[i]))) {
        await inscricao.unsubscribe();
        setInscricao(null);
        setMensagem('Toque em Ativar notificações de novo para confirmar a nova inscrição.');
        return;
      }

      // A primeira inscrição precisa começar no gesto do toque, antes de aguardar qualquer operação.
      const novaInscricao = inscricao ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chavePublica });
      setInscricao(novaInscricao);
      const codigoDoAparelho = obterCodigoDoAparelho();
      const status = await enviarParaPonte('inscrever', codigoDoAparelho, novaInscricao);
      if (status !== 204) throw new Error('Inscrição recusada');
      setCodigo(codigoDoAparelho);
      setMensagem('Notificações ativadas. Toque em Enviar teste.');
    } catch {
      setMensagem(Notification.permission === 'denied'
        ? 'Permita as notificações do Capi nos Ajustes do iPhone e tente novamente.'
        : 'O Capi não conseguiu ativar as notificações. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    if (!codigo) return;
    setOcupado(true);
    setMensagem('');
    try {
      const status = await enviarParaPonte('teste', codigo);
      if (status === 404 || status === 410) {
        if (status === 410 && inscricao) {
          await inscricao.unsubscribe();
          setInscricao(null);
        }
        setMensagem('Toque em Ativar notificações e tente de novo.');
        return;
      }
      if (status !== 204) throw new Error('Teste recusado');
      setMensagem('Teste enviado. Toque na notificação para abrir o Capi.');
    } catch {
      setMensagem('O Capi não conseguiu enviar o teste. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  const indisponivel = !instalado ? 'Instale o Capi na Tela de Início e abra pelo ícone para ativar as notificações.'
    : !suportaPush ? 'As notificações precisam do iOS 16.4 ou posterior.'
      : !chavePublica ? 'A prova de notificações ainda não foi publicada.' : '';

  return (
    <section className="cartao" aria-labelledby="notificacoes-do-atalho" style={{ marginBottom: 16 }}>
      <h2 id="notificacoes-do-atalho" className="titulo">Notificações de teste</h2>
      {indisponivel ? <p className="texto-2" style={{ marginBottom: 0 }}>{indisponivel}</p> : (
        <>
          <p className="texto-2">Envie uma notificação e toque nela para abrir o Capi instalado.</p>
          <div className="modelo-url">
            <button type="button" className="chip" disabled={!registro || ocupado} onClick={ativar}>Ativar notificações</button>
            <button type="button" className="chip" disabled={!inscricao || !codigo || ocupado} onClick={testar}>Enviar teste</button>
          </div>
          <p className="rotulo" role="status" style={{ marginBottom: 0 }}>{mensagem}</p>
        </>
      )}
    </section>
  );
}
