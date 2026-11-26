import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { enderecoDoPagamento } from '../leitor/pushDoAtalho';
import { NotificacoesDoAtalho } from './NotificacoesDoAtalho';
import { navegar } from './rotas';

export function Atalho() {
  const endereco = enderecoDoPagamento();
  const [codigo, setCodigo] = useState<string | null>(null);
  const autorizacao = codigo ? `Bearer ${codigo}` : null;
  const [mensagem, setMensagem] = useState('');

  async function copiar(conteudo: string, nome: 'Endereço' | 'Valor do cabeçalho') {
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
        <p className="texto-2">Ao pagar por aproximação com o Apple Pay, toque na notificação para revisar e salvar o Lançamento na Capi.</p>
        <ol className="passos">
          <li className="cartao passo">
            <span className="passo-numero num">1</span>
            <div className="passo-corpo">
              <h2 className="titulo">Crie a automação de Transação</h2>
              <p>Abra o Atalhos, toque em <strong>Automação</strong> e em <strong>+</strong>. Escolha <strong>Transação</strong> ou <strong>Carteira</strong>, conforme a versão do iOS, e marque os cartões que usa para pagar.</p>
              <p>Selecione <strong>Executar Imediatamente</strong>, avance e toque em <strong>Nova Automação em Branco</strong>.</p>
              <p>No topo do editor, mantenha <strong>Receber transação como entrada</strong>. É dessa entrada que vêm a quantia e a Loja.</p>
            </div>
          </li>
          <li className="cartao passo">
            <span className="passo-numero num">2</span>
            <div className="passo-corpo">
              <h2 className="titulo">Adicione Obter Conteúdo do URL</h2>
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
                  <dt>Cabeçalhos</dt>
                  <dd>
                    Toque em <strong>Adicionar novo cabeçalho</strong>. Digite <code>Authorization</code> no campo <strong>Chave</strong>, à esquerda. Cole o valor abaixo no campo à direita.
                    {autorizacao ? (
                      <div className="modelo-url">
                        <code>{autorizacao}</code>
                        <button type="button" className="chip" onClick={() => copiar(autorizacao, 'Valor do cabeçalho')}>Copiar valor do cabeçalho</button>
                      </div>
                    ) : <p className="rotulo">Ative as notificações acima para obter o código.</p>}
                  </dd>
                </div>
                <div>
                  <dt>Pedir Corpo</dt>
                  <dd>
                    Escolha <strong>JSON</strong>. Toque em <strong>Adicionar novo campo</strong>, escolha <strong>Texto</strong> e digite <code>valor</code> em <strong>Chave</strong>.
                    <p>Toque no campo <strong>Texto</strong>, à direita. Na barra acima do teclado, escolha <strong>Entrada do Atalho</strong>. Se precisar, deslize a barra ou toque em <strong>Selecionar Variável</strong> e escolha a entrada da transação no topo.</p>
                    <p>Toque na etiqueta azul que apareceu no campo e escolha <strong>Quantia</strong>.</p>
                    <p>Adicione outro campo <strong>Texto</strong> com a chave <code>loja</code>. Insira <strong>Entrada do Atalho</strong> de novo, toque na etiqueta azul e escolha <strong>Comerciante</strong>. Toque em <strong>OK</strong> para salvar.</p>
                  </dd>
                </div>
              </dl>
              <span className="rotulo" role="status">{mensagem}</span>
            </div>
          </li>
        </ol>
        <p className="texto-2"><strong>Enviar teste</strong> verifica se a notificação chega. Na próxima compra por aproximação, abra a notificação e confira se o valor e a Loja vieram preenchidos. O botão de executar no Atalhos roda sem os dados da compra.</p>
      </Folha>
    </main>
  );
}
