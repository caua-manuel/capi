import { Icone, type NomeDoIcone } from './Icone';
import { navegar, type Rota } from '../telas/rotas';

export type AbaDaBarra = 'inicio' | 'metas' | 'fatura' | 'ajustes';

const ABAS: { rota: AbaDaBarra; icone: NomeDoIcone; nome: string }[] = [
  { rota: 'inicio', icone: 'casa', nome: 'Início' },
  { rota: 'metas', icone: 'alvo', nome: 'Metas' },
  { rota: 'fatura', icone: 'cartao', nome: 'Fatura' },
  { rota: 'ajustes', icone: 'ajustes', nome: 'Ajustes' },
];

export function ehAba(rota: Rota): rota is AbaDaBarra {
  return ABAS.some((a) => a.rota === rota);
}

/** Barra de baixo flutuante com vidro: quatro abas e o botão de lançar. */
export function BarraDeBaixo({ ativa, onLancar }: { ativa: AbaDaBarra; onLancar: () => void }) {
  return (
    <>
      <div className="barra-fade" aria-hidden="true" />
      <nav className="barra" aria-label="Navegação">
        {ABAS.map((aba) => (
          <button key={aba.rota} type="button" className={aba.rota === ativa ? 'aba ativa' : 'aba'}
            aria-label={aba.nome} aria-current={aba.rota === ativa ? 'page' : undefined} onClick={() => navegar(aba.rota)}>
            <Icone nome={aba.icone} tamanho={aba.rota === ativa ? 20 : 22} traco={aba.rota === ativa ? 1.8 : 1.6} />
            {aba.rota === ativa && <span>{aba.nome}</span>}
          </button>
        ))}
        <button type="button" className="botao-lancar" aria-label="Lançar gasto" onClick={onLancar}>
          <Icone nome="mais" tamanho={24} traco={2.2} />
        </button>
      </nav>
    </>
  );
}
