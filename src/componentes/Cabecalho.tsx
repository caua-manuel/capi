import type { ReactNode } from 'react';
import { Icone } from './Icone';

interface Props {
  linha1: string;
  linha2: string;
  onVoltar: () => void;
  /** Imagem da Capi, quando a tela tiver uma. */
  capi?: string;
}

/** Cabeçalho marinho das telas de detalhe, com o título em duas linhas e a folha subindo por cima. */
export function Cabecalho({ linha1, linha2, onVoltar, capi }: Props) {
  return (
    <header className="cabecalho">
      <button type="button" className="botao-voltar" aria-label="Voltar" onClick={onVoltar}>
        <Icone nome="voltar" tamanho={22} traco={2} />
      </button>
      <div className="cabecalho-linha">
        <h1 className="titulo-grande">
          {linha1}
          <br />
          <span style={{ color: 'var(--herodestaque)' }}>{linha2}</span>
        </h1>
        {capi && <img className="capi" src={`${import.meta.env.BASE_URL}capi/${capi}`} alt="" style={{ height: 110 }} />}
      </div>
    </header>
  );
}

export function Folha({ children }: { children: ReactNode }) {
  return <div className="folha-conteudo">{children}</div>;
}
