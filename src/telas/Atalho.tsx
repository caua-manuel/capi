import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import { NotificacoesDoAtalho } from './NotificacoesDoAtalho';
import { enderecoCompleto, navegar } from './rotas';

const PASSOS: { titulo: string; texto: string; dica?: string }[] = [
  { titulo: 'Abra o app Atalhos', texto: 'Ele já vem no iPhone. Toque na aba Automação, embaixo.' },
  { titulo: 'Crie uma automação de Transação', texto: 'Toque em + (ou Nova Automação) e escolha Transação.' },
  {
    titulo: 'Escolha os cartões',
    texto: 'Marque os cartões da Carteira que você usa por aproximação, crédito ou débito. Selecione Executar Imediatamente e toque em Avançar.',
    dica: 'Com Executar Imediatamente, o iPhone não pergunta nada antes de abrir o Capi.',
  },
  { titulo: 'Comece em branco', texto: 'Toque em Nova Automação em Branco.' },
  {
    titulo: 'Codifique a Quantia e o Comerciante',
    texto: 'Adicione a ação Codificar URL e escolha a variável Quantia. Adicione outra Codificar URL e escolha Comerciante.',
    dica: 'Isso faz o valor e nomes com acento ou espaço chegarem certos.',
  },
  {
    titulo: 'Abra o Capi',
    texto: 'Adicione a ação Abrir URLs. Cole o endereço abaixo e troque [Quantia] e [Comerciante] pelas duas variáveis codificadas.',
  },
  { titulo: 'Teste', texto: 'Pague algo por aproximação. O Capi abre com o valor e a loja preenchidos; você só confirma a Categoria.' },
];

export function Atalho() {
  const modelo = `${enderecoCompleto('lancar')}?origem=applepay&valor=[Quantia]&loja=[Comerciante]`;
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(modelo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Atalho do Apple Pay" linha2="passo a passo" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <NotificacoesDoAtalho />
        <p className="texto-2" style={{ margin: '0 4px 16px' }}>
          Uma automação do app Atalhos abre o Capi sempre que você paga por aproximação. Leva uns 3 minutos e não precisa saber programar.
        </p>
        <ol className="passos">
          {PASSOS.map((passo, i) => (
            <li key={passo.titulo} className="cartao passo">
              <span className="passo-numero num">{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <h2 className="titulo">{passo.titulo}</h2>
                <p style={{ margin: '4px 0 0' }}>{passo.texto}</p>
                {passo.dica && <p className="rotulo" style={{ margin: '8px 0 0' }}>{passo.dica}</p>}
                {i === 5 && (
                  <div className="modelo-url">
                    <code>{modelo}</code>
                    <button type="button" className="chip" onClick={copiar} aria-live="polite">
                      {copiado ? 'Copiado' : 'Copiar endereço'}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="botao-secundario" style={{ marginTop: 16 }}
          onClick={() => window.location.assign(`${enderecoCompleto('lancar')}?origem=applepay&valor=42%2C50&loja=Padaria%20S%C3%A3o%20Jos%C3%A9`)}>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Icone nome="raio" tamanho={18} />Ver como fica</span>
        </button>
      </Folha>
    </main>
  );
}
