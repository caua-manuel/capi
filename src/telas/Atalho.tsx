import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { enderecoDoPagamento } from '../leitor/pushDoAtalho';
import { NotificacoesDoAtalho } from './NotificacoesDoAtalho';
import { navegar } from './rotas';

export function Atalho() {
  const endereco = enderecoDoPagamento();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');

  async function copiar(conteudo: string, nome: 'Endereço' | 'Código') {
    try {
      await navigator.clipboard.writeText(conteudo);
      setMensagem(`${nome} copiado.`);
    } catch {
      setMensagem('Não consegui copiar. Selecione o texto e copie manualmente.');
    }
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Atalho do Apple Pay" linha2="passo a passo" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <NotificacoesDoAtalho onCodigoDisponivel={setCodigo} />
        <ol className="passos">
          <li className="cartao passo">
            <span className="passo-numero num">1</span>
            <div className="passo-corpo">
              <h2 className="titulo">Crie a automação de Transação</h2>
              <p>Abra o Atalhos, toque em <strong>Automação</strong> e em <strong>+</strong>. Escolha <strong>Transação</strong> e marque seus cartões da Carteira.</p>
              <p>Selecione <strong>Executar Imediatamente</strong>, avance e toque em <strong>Nova Automação em Branco</strong>.</p>
              <figure className="passo-print"><figcaption className="rotulo">Espaço para o print do passo</figcaption></figure>
            </div>
          </li>
          <li className="cartao passo">
            <span className="passo-numero num">2</span>
            <div className="passo-corpo">
              <h2 className="titulo">Adicione Obter Conteúdo do URL</h2>
              <p>Configure a ação com estes valores e salve a automação.</p>
              <dl className="campos-do-atalho">
                <div>
                  <dt>URL</dt>
                  <dd className="modelo-url">
                    {endereco ? (
                      <>
                        <code>{endereco}</code>
                        <button type="button" className="chip" onClick={() => copiar(endereco, 'Endereço')}>Copiar endereço</button>
                      </>
                    ) : 'Endereço da ponte indisponível.'}
                  </dd>
                </div>
                <div><dt>Método</dt><dd><code>POST</code></dd></div>
                <div>
                  <dt>Cabeçalho <code>Authorization</code></dt>
                  <dd>
                    Digite <code>Bearer</code>, deixe um espaço e cole o Código do aparelho.
                    {codigo ? (
                      <div className="modelo-url">
                        <code aria-label="Código do aparelho">{codigo}</code>
                        <button type="button" className="chip" onClick={() => copiar(codigo, 'Código')}>Copiar código</button>
                      </div>
                    ) : <p className="rotulo">Ative as notificações acima para obter o código.</p>}
                  </dd>
                </div>
                <div>
                  <dt>Corpo da solicitação</dt>
                  <dd>
                    Escolha <strong>JSON</strong> e adicione dois campos.
                    <ul>
                      <li><code>valor</code> recebe a variável <strong>Quantia</strong>.</li>
                      <li><code>loja</code> recebe a variável <strong>Comerciante</strong>.</li>
                    </ul>
                  </dd>
                </div>
              </dl>
              <span className="rotulo" role="status">{mensagem}</span>
              <figure className="passo-print"><figcaption className="rotulo">Espaço para o print do passo</figcaption></figure>
            </div>
          </li>
        </ol>
        <p className="texto-2">O botão ▶ do Atalhos não serve de teste. Use <strong>Enviar teste</strong> aqui ou faça um pagamento pequeno.</p>
      </Folha>
    </main>
  );
}
