import type { ReactNode } from 'react';
import { Icone, type NomeDoIcone } from '../componentes/Icone';
import { navegar, type Rota } from './rotas';

interface Props {
  discreto: boolean;
  onAlternarDiscreto: () => void;
  quantidadeDeFixos: number;
  categoriasPadrao: number;
  categoriasProprias: number;
  resumoDosParametros: string;
}

interface Item {
  rota: Rota;
  icone: NomeDoIcone;
  titulo: string;
  descricao: string;
}

function Linha({ icone, titulo, descricao, verde, fim, onClick }: {
  icone: NomeDoIcone; titulo: string; descricao: string; verde?: boolean; fim?: ReactNode; onClick?: () => void;
}) {
  const miolo = (
    <>
      <span className={verde ? 'ajuste-icone verde' : 'ajuste-icone'}><Icone nome={icone} tamanho={19} traco={1.7} /></span>
      <span className="ajuste-texto">
        <span className="ajuste-titulo">{titulo}</span>
        <span className="ajuste-sub">{descricao}</span>
      </span>
      {fim}
    </>
  );
  return onClick ? <button type="button" className="linha-ajuste" onClick={onClick}>{miolo}</button> : <div className="linha-ajuste">{miolo}</div>;
}

const seta = <span className="ajuste-seta"><Icone nome="seta" tamanho={16} /></span>;

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="grupo" aria-label={titulo}>
      <h2 className="grupo-titulo">{titulo}</h2>
      <div className="grupo-cartao">{children}</div>
    </section>
  );
}

export function Ajustes({ discreto, onAlternarDiscreto, quantidadeDeFixos, categoriasPadrao, categoriasProprias, resumoDosParametros }: Props) {
  const itensDoPlano: Item[] = [
    { rota: 'onboarding', icone: 'lapis', titulo: 'Suas respostas', descricao: 'Renda, moradia, fixos, dívidas e objetivos' },
    { rota: 'fixos', icone: 'calendario', titulo: 'Fixos', descricao: quantidadeDeFixos === 0 ? 'Nenhum cadastrado ainda' : quantidadeDeFixos === 1 ? '1 item, entra sozinho todo mês' : `${quantidadeDeFixos} itens, entram sozinhos todo mês` },
    { rota: 'dividas', icone: 'recibo', titulo: 'Dívidas', descricao: 'Avalanche x bola de neve e texto para renegociar' },
    { rota: 'assinaturas', icone: 'repetir', titulo: 'Assinaturas', descricao: 'Cobranças que se repetem, com custo anual' },
    { rota: 'diagnostico', icone: 'grafico', titulo: 'Diagnóstico', descricao: 'Sobra, 50-30-20, fôlego e Status' },
    { rota: 'parametros', icone: 'percentual', titulo: 'Parâmetros', descricao: resumoDosParametros },
    { rota: 'categorias', icone: 'etiqueta', titulo: 'Categorias', descricao: `${categoriasPadrao} padrão · ${categoriasProprias} ${categoriasProprias === 1 ? 'sua' : 'suas'}` },
  ];

  return (
    <main className="tela">
      <h1 className="titulo-ajustes">Ajustes</h1>
      <div className="cartao-capi-gelo">
        <img className="capi" src={`${import.meta.env.BASE_URL}capi/capi-cofre.png`} alt="" style={{ height: 96 }} />
        <div>
          <div style={{ fontWeight: 600 }}>Seus dados ficam comigo</div>
          <div className="texto-2" style={{ fontSize: 13 }}>Só neste celular, sem login e sem servidor. Faça backup todo mês.</div>
        </div>
      </div>

      <Grupo titulo="Privacidade">
        <Linha icone="olhoFechado" titulo="Modo discreto" descricao="Esconde os valores"
          fim={<input type="checkbox" role="switch" className="interruptor" aria-label="Modo discreto" checked={discreto} onChange={onAlternarDiscreto} />} />
        <Linha icone="escudo" verde titulo="Dados só neste celular" descricao="Sem login e sem servidor" />
      </Grupo>

      <Grupo titulo="Atalhos do iPhone">
        <Linha icone="raio" titulo="Lançar pelo Apple Pay" descricao="Abre o app preenchido ao pagar" fim={seta} onClick={() => navegar('atalho')} />
        <Linha icone="sino" titulo="Lembretes" descricao="Check-in, dia do pagamento e fechamento" fim={seta} onClick={() => navegar('lembretes')} />
      </Grupo>

      <Grupo titulo="Plano">
        {itensDoPlano.map((item) => (
          <Linha key={item.rota} icone={item.icone} titulo={item.titulo} descricao={item.descricao} fim={seta} onClick={() => navegar(item.rota)} />
        ))}
      </Grupo>

      <p className="rotulo" style={{ margin: '16px 28px 0', textAlign: 'center', color: 'var(--tx3)' }}>
        Este plano é educativo e não é recomendação de investimento. O Capi nunca pede senha de banco nem número de cartão.
      </p>
    </main>
  );
}
