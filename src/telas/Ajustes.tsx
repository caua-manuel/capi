import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone, type NomeDoIcone } from '../componentes/Icone';
import { navegar, type Rota } from './rotas';

const ITENS: { rota: Rota; icone: NomeDoIcone; titulo: string; descricao: string }[] = [
  { rota: 'onboarding', icone: 'lapis', titulo: 'Suas respostas', descricao: 'Renda, moradia, fixos, dívidas e objetivos' },
  { rota: 'fixos', icone: 'raio', titulo: 'Fixos', descricao: 'Treino, celular, faculdade: entram sozinhos todo mês' },
  { rota: 'dividas', icone: 'check', titulo: 'Dívidas', descricao: 'Avalanche x bola de neve e texto para renegociar' },
  { rota: 'diagnostico', icone: 'check', titulo: 'Diagnóstico', descricao: 'Sobra, 50-30-20, fôlego e Status' },
  { rota: 'categorias', icone: 'ajustes', titulo: 'Categorias', descricao: 'Criar, renomear e esconder' },
  { rota: 'atalho', icone: 'raio', titulo: 'Atalho do Apple Pay', descricao: 'Lançar sozinho ao pagar por aproximação' },
];

export function Ajustes() {
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Ajustes" linha2="do seu jeito" onVoltar={() => navegar('inicio')} capi="capi-cofre.png" />
      <Folha>
        <section className="cartao lista" style={{ margin: 0 }}>
          <ul>
            {ITENS.map((item) => (
              <li key={item.rota}>
                <button type="button" className="item-lancamento" onClick={() => navegar(item.rota)}>
                  <span style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                    <span className="icone-redondo"><Icone nome={item.icone} /></span>
                    <span className="item-texto">
                      <span className="item-loja">{item.titulo}</span>
                      <span className="rotulo">{item.descricao}</span>
                    </span>
                  </span>
                  <span className="texto-2"><Icone nome="seta" tamanho={16} /></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 8px 0', color: 'var(--tx3)' }}>
          Seus dados ficam só neste aparelho. O Capi nunca pede senha de banco nem número de cartão.
        </p>
      </Folha>
    </main>
  );
}
