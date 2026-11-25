import { useState } from 'react';
import { Icone } from '../componentes/Icone';
import { proximaEtapa, type AcaoDaInstalacao, type EtapaDaInstalacao } from './instalacao';

interface Props {
  /** Já existem dados neste navegador: oferece exportar antes de sair. */
  temDados: boolean;
  onExportar: () => void;
  /** A pessoa confirmou que quer continuar no navegador. */
  onContinuar: () => void;
}

export const AVISO_DE_DADOS = 'Se você começar aqui no navegador e instalar depois, seus dados não passam para o app instalado e você recomeça do zero.';

const TOQUES = [
  'Toque em Compartilhar, o quadrado com a seta para cima, na barra do Safari.',
  'Role e toque em Adicionar à Tela de Início.',
  'Abra a Capi pelo ícone novo na Tela de Início.',
];

/** Primeira tela, antes do Onboarding, quando o app abre no Safari do iPhone (ADR 0002). */
export function Instalar({ temDados, onExportar, onContinuar }: Props) {
  const [etapa, setEtapa] = useState<EtapaDaInstalacao>('orientacao');
  const base = import.meta.env.BASE_URL;

  function agir(acao: AcaoDaInstalacao) {
    const passo = proximaEtapa(etapa, acao);
    setEtapa(passo.etapa);
    if (passo.dispensar) onContinuar();
  }

  return (
    <main className="tela instalar">
      <img className="capi" src={`${base}capi/capi-acena.png`} alt="" style={{ height: 150, margin: '0 auto' }} />
      <h1 className="titulo-grande" style={{ margin: '12px 24px 0' }}>
        Instale a Capi primeiro<br /><span className="texto-2">são 3 toques</span>
      </h1>

      {etapa === 'orientacao' && (
        <>
          <ol className="passos" style={{ margin: '16px 16px 0' }}>
            {TOQUES.map((t, i) => (
              <li key={t} className="cartao passo" style={{ margin: 0 }}>
                <span className="passo-numero num">{i + 1}</span>
                <p style={{ margin: 0 }}>{t}</p>
              </li>
            ))}
          </ol>
          <section className="cartao-gelo" style={{ margin: '12px 16px 0', padding: '14px 18px' }} role="note">
            <p style={{ margin: 0, fontWeight: 500 }}>{AVISO_DE_DADOS}</p>
          </section>
          <div className="instalar-acoes">
            {temDados && (
              <button type="button" className="botao-secundario" onClick={onExportar}>Exportar backup antes</button>
            )}
            <button type="button" className="botao-principal" onClick={() => agir('ja-instalei')}>
              Já instalei
              <span className="seta"><Icone nome="check" tamanho={18} traco={2} /></span>
            </button>
            <button type="button" className="link" onClick={() => agir('continuar')}>Continuar no navegador mesmo assim</button>
          </div>
        </>
      )}

      {etapa === 'ja-instalei' && (
        <section className="cartao" style={{ margin: '16px 16px 0' }} aria-live="polite">
          <h2 className="titulo">Agora abra pelo ícone</h2>
          <p className="texto-2" style={{ margin: '6px 0 0' }}>
            Feche esta aba do Safari e abra a Capi pelo ícone na Tela de Início. Lá a tela de instalação some e você começa com os dados no lugar certo.
          </p>
          {temDados && (
            <p className="texto-2" style={{ margin: '6px 0 0' }}>
              Já tinha dados aqui? Exporte o backup e, no app instalado, use Importar backup na primeira tela.
            </p>
          )}
          <div className="instalar-acoes" style={{ padding: 0, marginTop: 12 }}>
            {temDados && <button type="button" className="botao-secundario" onClick={onExportar}>Exportar backup</button>}
            <button type="button" className="link" onClick={() => agir('voltar')}>Voltar</button>
          </div>
        </section>
      )}

      {etapa === 'confirmar' && (
        <section className="cartao" style={{ margin: '16px 16px 0' }} role="alertdialog" aria-label="Confirmar" aria-live="polite">
          <h2 className="titulo">Continuar no navegador?</h2>
          <p style={{ margin: '6px 0 0', fontWeight: 500 }}>{AVISO_DE_DADOS}</p>
          <div className="instalar-acoes" style={{ padding: 0, marginTop: 12 }}>
            {temDados && <button type="button" className="botao-secundario" onClick={onExportar}>Exportar backup antes</button>}
            <button type="button" className="botao-principal" onClick={() => agir('voltar')}>
              Voltar e instalar
              <span className="seta"><Icone nome="voltar" tamanho={18} traco={2} /></span>
            </button>
            <button type="button" className="link" onClick={() => agir('continuar')}>Entendi, continuar no navegador</button>
          </div>
        </section>
      )}
    </main>
  );
}
