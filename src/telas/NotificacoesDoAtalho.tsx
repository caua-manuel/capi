import { useEffect, useState } from 'react';
import { apagarCodigoDoAparelho, chavePublicaDoAtalho, confirmarCodigoDoAparelho, desligarAtalho, enviarParaPonte, lerCodigoDoAparelho, obterCodigoDoAparelho } from '../leitor/pushDoAtalho';
import { lerAmbiente } from './instalacao';

export function NotificacoesDoAtalho({ onCodigoDisponivel }: { onCodigoDisponivel: (codigo: string | null) => void }) {
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

  useEffect(() => {
    const podeMostrar = instalado && suportaPush && chavePublica && inscricao && Notification.permission === 'granted';
    onCodigoDisponivel(podeMostrar ? codigo : null);
  }, [chavePublica, codigo, inscricao, instalado, suportaPush, onCodigoDisponivel]);

  async function inscrever(novaInscricao: PushSubscription) {
    const codigoDoAparelho = obterCodigoDoAparelho();
    const status = await enviarParaPonte('inscrever', codigoDoAparelho, novaInscricao);
    if (status === 409) {
      apagarCodigoDoAparelho();
      setCodigo(null);
      setMensagem('O código anterior foi desativado. Toque em Ativar notificações para criar um novo.');
      return false;
    }
    if (status !== 204) throw new Error('Inscrição recusada');
    confirmarCodigoDoAparelho(codigoDoAparelho);
    setCodigo(codigoDoAparelho);
    return true;
  }

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
      if (await inscrever(novaInscricao)) setMensagem('Notificações ativadas. Toque em Enviar teste.');
    } catch {
      setMensagem(Notification.permission === 'denied'
        ? 'Permita as notificações do Capi nos Ajustes do iPhone e tente novamente.'
        : 'O Capi não conseguiu ativar as notificações. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  async function desligarOuTrocar(trocar: boolean) {
    if (!codigo || (trocar && !inscricao)) return;
    setOcupado(true);
    setMensagem('');
    let desligado = false;
    try {
      await desligarAtalho(codigo);
      apagarCodigoDoAparelho();
      setCodigo(null);
      desligado = true;
      if (trocar && inscricao) {
        if (await inscrever(inscricao)) setMensagem('Novo código ativo. Atualize o código na automação do Atalhos.');
      } else {
        setMensagem('Atalho desligado. Inscrição e pagamentos pendentes apagados do servidor.');
      }
    } catch {
      setMensagem(desligado ? 'Toque em Ativar notificações para terminar de gerar o novo código.'
        : 'O Capi não conseguiu confirmar a exclusão no servidor. Tente novamente com rede.');
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
      <h2 id="notificacoes-do-atalho" className="titulo">{codigo ? 'Apple Pay ligado' : 'Apple Pay desligado'}</h2>
      {indisponivel ? <p className="texto-2" style={{ marginBottom: 0 }}>{indisponivel}</p> : (
        <>
          <p className="texto-2">A ponte guarda o valor e a Loja só até o Capi ler, por até 48 horas. O valor e a Loja aparecem na notificação.</p>
          <div className="modelo-url">
            <button type="button" className="chip" disabled={!registro || ocupado} onClick={ativar}>Ativar notificações</button>
            <button type="button" className="chip" disabled={!inscricao || !codigo || ocupado} onClick={testar}>Enviar teste</button>
            {codigo && (
              <>
                <button type="button" className="chip" disabled={!inscricao || ocupado} onClick={() => desligarOuTrocar(true)}>Gerar novo código</button>
                <button type="button" className="chip" disabled={ocupado} onClick={() => desligarOuTrocar(false)}>Desligar e apagar do servidor</button>
              </>
            )}
          </div>
          {codigo && <p className="rotulo">Trocar o código também apaga os pagamentos pendentes do código anterior.</p>}
          <p className="rotulo" role="status" style={{ marginBottom: 0 }}>{mensagem}</p>
        </>
      )}
    </section>
  );
}
